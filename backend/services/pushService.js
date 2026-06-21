/**
 * Push notification service (Firebase Cloud Messaging).
 *
 * The original app had NO push notification implementation at all —
 * notifications were just an in-memory array shown in the app's own bell
 * icon, which only works while the app is open and connected to the socket.
 * On Android, once the app is backgrounded or killed by the OS (which
 * happens aggressively to save battery), the socket dies and the user gets
 * nothing. Real "new message" / "incoming call" alerts on a locked phone
 * require FCM, which is why this module exists.
 *
 * Setup required (see PUSH_NOTIFICATIONS_SETUP.md):
 *   1. Create a Firebase project, add an Android app with package name
 *      com.talker.chatapp, download google-services.json into
 *      frontend/android/app/.
 *   2. In the Firebase console: Project Settings > Service Accounts >
 *      Generate new private key. Save the JSON file as
 *      backend/config/firebase-service-account.json (NEVER commit this file).
 *   3. Set GOOGLE_APPLICATION_CREDENTIALS in backend/.env to its path, or
 *      paste the JSON contents into FIREBASE_SERVICE_ACCOUNT_JSON env var
 *      (useful for hosts like Render/Railway where you can't upload files).
 *
 * If neither is configured, this module logs a warning once and all push
 * calls become silent no-ops — the rest of the app (sockets, REST API)
 * keeps working normally, so a missing Firebase setup never breaks chat.
 */

const path = require("path");
const fs = require("fs");

let admin = null;
let initialized = false;
let initError = null;

function init() {
  if (initialized) return;
  initialized = true;
  try {
    admin = require("firebase-admin");

    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(parsed);
    } else {
      const credPath =
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        path.join(__dirname, "..", "config", "firebase-service-account.json");
      if (!fs.existsSync(credPath)) {
        throw new Error(
          `Firebase service account file not found at ${credPath}. ` +
            "Push notifications are disabled until this is configured."
        );
      }
      credential = admin.credential.cert(require(credPath));
    }

    admin.initializeApp({ credential });
    console.log("[push] Firebase Admin initialized — push notifications enabled.");
  } catch (err) {
    initError = err;
    console.warn(`[push] Push notifications disabled: ${err.message}`);
  }
}

/**
 * Send a push notification to every device token registered for a user.
 * Silently does nothing if Firebase isn't configured, or if the user has
 * no registered tokens (e.g. they've never opened the Android app).
 *
 * @param {string} userId - Mongo _id of the recipient user
 * @param {{title: string, body: string, data?: object}} payload
 */
async function sendPushToUser(userId, payload) {
  init();
  if (!admin || initError) return;

  const User = require("../models/userModel");
  const user = await User.findById(userId).select("fcmTokens");
  if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return;

  const message = {
    notification: { title: payload.title, body: payload.body },
    data: payload.data
      ? Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)]))
      : undefined,
    tokens: user.fcmTokens,
    android: {
      priority: "high",
      notification: { channelId: payload.channelId || "messages", sound: "default" },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    // Clean up tokens FCM reports as dead (app uninstalled, token rotated, etc.)
    const deadTokens = [];
    response.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code || "";
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-argument")
        ) {
          deadTokens.push(user.fcmTokens[idx]);
        }
      }
    });
    if (deadTokens.length) {
      await User.updateOne({ _id: userId }, { $pullAll: { fcmTokens: deadTokens } });
    }
  } catch (err) {
    console.error("[push] sendEachForMulticast failed:", err.message);
  }
}

module.exports = { sendPushToUser };
