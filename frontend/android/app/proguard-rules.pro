# Add project specific ProGuard rules here.

# ── Capacitor core + plugins ────────────────────────────────────────────────
# Capacitor's bridge uses reflection (@CapacitorPlugin annotations, @PluginMethod)
# to discover and call plugin methods from JS. R8 doesn't know this and will
# strip/rename these classes/methods unless told not to — without these
# rules, plugin calls silently fail in release builds while working fine in
# debug (a classic "works on debug, breaks on release" minification bug).
-keep class com.getcapacitor.** { *; }
-keep class com.talker.chatapp.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin *;
    @com.getcapacitor.PluginMethod *;
}

# ── WebView JavaScript interface ────────────────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Firebase Cloud Messaging ─────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# ── Gson / JSON used by Capacitor's bridge serialization ───────────────────
-keepattributes Signature
-keepattributes *Annotation*
-keep class sun.misc.Unsafe { *; }

# ── WebRTC (only relevant once the native screen-share dependency from
#    NATIVE_SCREEN_SHARE.md is added; harmless no-op until then) ───────────
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**
