package com.talker.chatapp;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // Capacitor's BridgeActivity wires up the WebView, the plugin bridge,
    // and permission-result forwarding automatically for plugins installed
    // via npm (Camera, PushNotifications, etc.) — those get auto-registered
    // through the capacitor.plugins.json file that `npx cap sync` generates.
    //
    // ScreenSharePlugin is a hand-written LOCAL plugin (not an npm package),
    // so it is NOT auto-discovered the same way and must be registered
    // explicitly here, before super.onCreate() loads the WebView — otherwise
    // any JS call to ScreenShare.startCapture()/stopCapture() will fail with
    // "plugin not implemented".
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScreenSharePlugin.class);
        createNotificationChannels();
        super.onCreate(savedInstanceState);
    }

    /**
     * Android 8+ (API 26+) silently drops any notification posted to a
     * channel ID that doesn't exist yet — no crash, no log, it just never
     * appears. The "messages" channel is auto-created by the Firebase
     * Messaging SDK from the default_notification_channel_id meta-data in
     * AndroidManifest.xml, but that mechanism only creates that ONE channel.
     * "calls" (used in server.js for incoming voice/video call pushes — see
     * the call-offer socket handler) has no such auto-creation path, so
     * every incoming-call notification was being silently swallowed on real
     * devices until this method creates it explicitly. createNotificationChannel
     * is idempotent — safe to call on every app start.
     */
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;

        NotificationChannel messages = new NotificationChannel(
                "messages", "Messages", NotificationManager.IMPORTANCE_DEFAULT);
        messages.setDescription("New chat messages and @mentions.");
        manager.createNotificationChannel(messages);

        NotificationChannel calls = new NotificationChannel(
                "calls", "Incoming Calls", NotificationManager.IMPORTANCE_HIGH);
        calls.setDescription("Incoming voice and video calls.");
        calls.setVibrationPattern(new long[]{0, 500, 250, 500});
        calls.enableVibration(true);
        calls.setSound(
                Uri.parse("content://settings/system/ringtone"),
                new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .build()
        );
        manager.createNotificationChannel(calls);
    }
}
