const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const statusRoutes = require("./routes/statusRoutes");
const pollRoutes = require("./routes/pollRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const fs = require("fs");
const { sendPushToUser } = require("./services/pushService");

dotenv.config();
connectDB();

const app = express();

/**
 * CORS allow-list.
 *
 * The original server had NO cors() middleware for the REST API at all, and
 * Socket.IO was hardcoded to a single origin. That breaks the Android app
 * because requests come from:
 *   - capacitor://localhost   (Capacitor's default Android scheme)
 *   - https://localhost       (when androidScheme: "https" is used, our config)
 *   - your real web frontend's origin, if you also serve a browser version
 *
 * Set ALLOWED_ORIGINS in backend/.env as a comma-separated list to add/remove
 * origins without touching code, e.g.:
 *   ALLOWED_ORIGINS=https://yourapp.com,capacitor://localhost,https://localhost
 */
const defaultOrigins = [
  "http://localhost:3000",
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
];
const allowedOrigins = (process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : defaultOrigins
);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (native HTTP clients, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/poll", pollRoutes);

app.use("/uploads/status", require("express").static(require("path").join(__dirname, "uploads/status")));

// This backend is deployed standalone (Vercel for the frontend, Render for
// this backend) — the React frontend is built separately with Vite and
// either bundled into the Android APK or deployed on its own. The backend
// never serves frontend/dist, so there is no dependency on which
// directory you happened to run `node server.js` from.
app.get("/", (req, res) => res.send("Talker API running"));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`Server on PORT ${PORT}`));

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: { origin: allowedOrigins, credentials: true },
});

io.on("connection", (socket) => {
  socket.on("setup", (userData) => { socket.join(userData._id); socket.emit("connected"); });
  socket.on("join chat", (room) => socket.join(room));
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (msg) => {
    const chat = msg.chat;
    if (!chat.users) return;
    chat.users.forEach((u) => {
      if (u._id === msg.sender._id) return;
      socket.in(u._id).emit("message recieved", msg);
      // Fire a push too. If the recipient's app is open and connected, the
      // OS will just show it in the notification tray behind the app (or
      // the client can choose to suppress it for the active chat); if the
      // app is backgrounded/killed, this is the only thing that reaches them.
      sendPushToUser(u._id, {
        title: chat.isGroupChat ? chat.chatName : msg.sender.name,
        body: msg.fileUrl ? `📎 ${msg.fileName || "Attachment"}` : (msg.content || "New message").slice(0, 120),
        data: { type: "message", chatId: String(chat._id) },
        channelId: "messages",
      }).catch((e) => console.error("[push] new message push failed:", e.message));
    });

    // ── @mention notifications ──────────────────────────────────────────
    if (Array.isArray(msg.mentions) && msg.mentions.length) {
      msg.mentions.forEach((mentionedUser) => {
        const mentionedId = mentionedUser?._id || mentionedUser;
        if (!mentionedId || mentionedId === msg.sender._id) return;
        socket.in(mentionedId).emit("user mentioned", {
          message: msg,
          chat,
          from: msg.sender,
        });
      });
    }
  });

  socket.on("message deleted", (msg) => {
    const chat = msg.chat;
    if (!chat.users) return;
    chat.users.forEach((u) => {
      if (u._id === msg.sender._id) return;
      socket.in(u._id).emit("message deleted", msg);
    });
  });

  // ── WebRTC Screen Share Signaling ─────────────────────────────────────────
  socket.on("screen-share-offer", ({ offer, to, from, fromName, chatId }) => {
    socket.to(to).emit("screen-share-offer", { offer, from, fromName, chatId });
  });

  socket.on("screen-share-answer", ({ answer, to }) => {
    socket.to(to).emit("screen-share-answer", { answer });
  });

  socket.on("ice-candidate", ({ candidate, to }) => {
    socket.to(to).emit("ice-candidate", { candidate });
  });

  socket.on("screen-share-end", ({ to }) => {
    socket.to(to).emit("screen-share-end");
  });

  // ── WebRTC Voice/Video Call Signaling ──────────────────────────────────────
  socket.on("call-offer", ({ offer, to, from, fromName, fromPic, isVideo }) => {
    socket.to(to).emit("call-offer", { offer, from, fromName, fromPic, isVideo });
    // High-priority "data-only" push so the Android app can show a full-screen
    // incoming-call UI even if the socket connection was dropped while
    // backgrounded. The actual WebRTC offer/answer still happens over the
    // socket once the user taps to open the app — this push only wakes it up.
    sendPushToUser(to, {
      title: `Incoming ${isVideo ? "video" : "voice"} call`,
      body: fromName || "Someone is calling you",
      data: { type: "call", from: String(from), isVideo: String(!!isVideo) },
      channelId: "calls",
    }).catch((e) => console.error("[push] call-offer push failed:", e.message));
  });

  socket.on("call-answer", ({ answer, to }) => {
    socket.to(to).emit("call-answer", { answer });
  });

  socket.on("call-reject", ({ to }) => {
    socket.to(to).emit("call-reject");
  });

  socket.on("call-end", ({ to }) => {
    socket.to(to).emit("call-end");
  });

  // ── Group Polls ───────────────────────────────────────────────────────────
  socket.on("poll created", ({ chatId, poll }) => {
    socket.in(chatId).emit("poll created", poll);
  });

  socket.on("poll updated", ({ chatId, poll }) => {
    socket.in(chatId).emit("poll updated", poll);
  });

  socket.on("poll deleted", ({ chatId, pollId }) => {
    socket.in(chatId).emit("poll deleted", pollId);
  });

  socket.on("disconnect", () => console.log("user disconnected"));
});
