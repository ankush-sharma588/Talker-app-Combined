package com.talker.chatapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Foreground service required by Android for any app capturing the screen
 * via MediaProjection. This is NOT optional — since Android 10, the OS will
 * forcibly stop screen capture if it isn't backed by a running foreground
 * service, and Android 14+ additionally requires the service to declare
 * foregroundServiceType="mediaProjection" in the manifest (already done).
 *
 * This service itself does no capture work — ScreenSharePlugin.java owns
 * the actual MediaProjection/VirtualDisplay objects. This service exists
 * purely to satisfy the OS requirement and show the mandatory "this app is
 * sharing your screen" persistent notification while sharing is active.
 */
public class ScreenCaptureService extends Service {

    public static final String CHANNEL_ID = "screen_capture";
    public static final int NOTIFICATION_ID = 9001;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannelIfNeeded();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Screen sharing active")
                .setContentText("Talker is sharing your screen in the current call.")
                .setSmallIcon(R.drawable.ic_notification)
                .setOngoing(true)
                .build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 14+ requires the foreground service type to be passed
            // explicitly here too, matching the manifest declaration.
            startForeground(
                    NOTIFICATION_ID,
                    notification,
                    android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            );
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
        return START_NOT_STICKY; // don't auto-restart; a dropped call shouldn't resurrect this service
    }

    private void createNotificationChannelIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Screen Sharing",
                    NotificationManager.IMPORTANCE_LOW // low: no sound, this is a persistent status notification
            );
            channel.setDescription("Shown while you are sharing your screen in a call.");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null; // not a bound service
    }
}
