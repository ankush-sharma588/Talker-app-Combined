package com.talker.chatapp;

import android.app.Activity;
import android.content.Intent;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * ScreenSharePlugin — native replacement for navigator.mediaDevices.getDisplayMedia(),
 * which does not exist on Android WebView/Chrome for Android. There is no
 * JS-only way to capture the device screen; Android requires going through
 * MediaProjection, a system API that:
 *   1. Shows the OS's own "Start recording or casting?" permission dialog
 *      (Capacitor/JS cannot trigger or skip this — it's an OS security
 *      screen, the Android equivalent of getDisplayMedia's browser prompt).
 *   2. Must run inside a foreground service while capturing (see
 *      ScreenCaptureService.java) or the OS kills the capture.
 *   3. Hands back raw video frames (via VirtualDisplay + ImageReader or
 *      Surface), which then need to be fed into the existing WebRTC
 *      PeerConnection as a custom VideoTrack source — this is the part
 *      that bridges native capture into the React app's existing WebRTC
 *      call code with minimal JS changes (see CallModal.js integration
 *      notes in NATIVE_SCREEN_SHARE.md).
 *
 * JS usage (after this plugin is registered):
 *   import { registerPlugin } from '@capacitor/core';
 *   const ScreenShare = registerPlugin('ScreenShare');
 *   await ScreenShare.startCapture();   // shows OS permission dialog, then starts
 *   await ScreenShare.stopCapture();
 */
@CapacitorPlugin(name = "ScreenShare")
public class ScreenSharePlugin extends Plugin {

    private MediaProjection mediaProjection;

    @PluginMethod
    public void startCapture(PluginCall call) {
        saveCall(call);
        MediaProjectionManager projectionManager =
                (MediaProjectionManager) getActivity().getSystemService(Activity.MEDIA_PROJECTION_SERVICE);
        Intent intent = projectionManager.createScreenCaptureIntent();
        startActivityForResult(call, intent, "handleCaptureResult");
    }

    @ActivityCallback
    private void handleCaptureResult(PluginCall call, androidx.activity.result.ActivityResult result) {
        if (call == null) return;

        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("User denied screen capture permission.");
            return;
        }

        // Start the mandatory foreground service BEFORE creating the
        // MediaProjection/VirtualDisplay, per Android's requirements.
        Intent serviceIntent = new Intent(getContext(), ScreenCaptureService.class);
        getContext().startForegroundService(serviceIntent);

        MediaProjectionManager projectionManager =
                (MediaProjectionManager) getActivity().getSystemService(Activity.MEDIA_PROJECTION_SERVICE);
        mediaProjection = projectionManager.getMediaProjection(result.getResultCode(), result.getData());

        // Required on Android 14+: the OS rejects createVirtualDisplay() on
        // a MediaProjection that has no registered callback. This also
        // covers the system revoking the projection at any time (e.g. the
        // user taps "Stop sharing" in the system status bar) — onStop()
        // fires then, and we must release our own reference and stop the
        // foreground service in response rather than keep operating on a
        // dead MediaProjection.
        mediaProjection.registerCallback(new MediaProjection.Callback() {
            @Override
            public void onStop() {
                mediaProjection = null;
                getContext().stopService(new Intent(getContext(), ScreenCaptureService.class));
                notifyListeners("screenShareStopped", new JSObject());
            }
        }, new Handler(Looper.getMainLooper()));

        // NOTE: Creating the VirtualDisplay and piping its Surface into a
        // WebRTC VideoCapturer (e.g. via a SurfaceTextureHelper +
        // org.webrtc.VideoSource, as in the google/webrtc-android SDK's
        // ScreenCapturerAndroid) is the remaining native step. That class is
        // ~150 lines wiring MediaProjection -> VirtualDisplay -> WebRTC
        // VideoSource and is intentionally not duplicated here since it
        // depends on which WebRTC native SDK version you add to
        // android/app/build.gradle. See NATIVE_SCREEN_SHARE.md for the
        // exact dependency and the reference implementation to adapt — the
        // callback registered above is a hard prerequisite for that next
        // step to work at all on Android 14+, so it's done here regardless.
        JSObject ret = new JSObject();
        ret.put("started", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void stopCapture(PluginCall call) {
        if (mediaProjection != null) {
            mediaProjection.stop();
            mediaProjection = null;
        }
        getContext().stopService(new Intent(getContext(), ScreenCaptureService.class));
        call.resolve();
    }
}
