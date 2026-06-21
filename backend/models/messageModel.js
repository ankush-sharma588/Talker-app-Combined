const mongoose = require("mongoose");

const messageSchema = mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true, default: "" },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Users mentioned via @username in this message
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // File upload fields
    fileUrl: { type: String, default: null },
    fileName: { type: String, default: null },
    fileType: { type: String, default: null },
    // Delete for everyone
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
