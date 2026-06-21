/**
 * Push notification wiring (Android, via Capacitor + FCM).
 *
 * Call initPushNotifications(user, navigate) once after login (and again on
 * app startup if a user is already logged in) from ChatProvider or Chatpage.
 * Call clearPushNotifications() on logout so a signed-out device doesn't
 * keep getting the previous account's notifications.
 *
 * This module is a no-op on web (Capacitor.isNativePlatform() is false),
 * so it's always safe to import and call regardless of platform.
 */
import { PushNotifications } from "@capacitor/push-notifications";
import { IS_NATIVE } from "../config/env";
import api from "../config/api";

const STORAGE_KEY = "talker-fcm-token";

let listenersRegistered = false;

export async function initPushNotifications(user, onNotificationTap) {
  if (!IS_NATIVE || !user?.token) return;

  const permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive !== "granted") {
    const requested = await PushNotifications.requestPermissions();
    if (requested.receive !== "granted") {
      console.warn("[push] Notification permission denied by user.");
      return; // respect the user's choice; the rest of the app still works
    }
  }

  await PushNotifications.register();

  if (!listenersRegistered) {
    listenersRegistered = true;

    PushNotifications.addListener("registration", async (token) => {
      try {
        localStorage.setItem(STORAGE_KEY, token.value);
        await api.post(
          "/api/user/push-token",
          { token: token.value },
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
      } catch (err) {
        console.error("[push] Failed to register token with backend:", err.message);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("[push] FCM registration error:", JSON.stringify(err));
    });

    // Notification arrived while the app was in the foreground. The app's
    // own socket listener already shows in-app state for this, so we avoid
    // showing a duplicate system notification on top of an open chat.
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[push] Received in foreground:", notification);
    });

    // User tapped a notification (app was backgrounded or closed).
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = action.notification?.data;
      if (data && onNotificationTap) onNotificationTap(data);
    });
  }
}

export async function clearPushNotifications(userToken) {
  if (!IS_NATIVE) return;
  const token = localStorage.getItem(STORAGE_KEY);
  if (token && userToken) {
    try {
      await api.delete("/api/user/push-token", {
        data: { token },
        headers: { Authorization: `Bearer ${userToken}` },
      });
    } catch (err) {
      console.error("[push] Failed to unregister token:", err.message);
    }
  }
  localStorage.removeItem(STORAGE_KEY);
  await PushNotifications.removeAllListeners();
  listenersRegistered = false;
}
