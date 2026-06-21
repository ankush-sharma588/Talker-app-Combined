const { CapacitorConfig } = require("@capacitor/cli");

/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: "com.talker.chatapp",
  appName: "Talker",
  webDir: "dist",
  // bundledWebRuntime: false is the default in Capacitor 6, no need to set it.
  android: {
    // Allow mixed content only if your backend is plain HTTP during dev.
    // Set to false for production once your API is served over HTTPS.
    allowMixedContent: false,
    buildOptions: {
      // Signing is configured via android/keystore.properties (see RELEASE_BUILD.md)
    },
  },
  server: {
    androidScheme: "https", // app served from https://localhost inside the WebView (required for getUserMedia/WebRTC)
    cleartextTrafficPermitted: false, // set true only if you must hit a non-TLS API during local dev
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0d0d14",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

module.exports = config;
