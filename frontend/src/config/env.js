/**
 * Centralized runtime configuration.
 *
 * Set VITE_API_URL in frontend/.env to your backend's reachable URL, e.g.:
 *   VITE_API_URL=https://talker-backend.onrender.com
 *
 * This is required in every context — local dev, the Vercel-hosted web
 * build, and the Android app — because there is no dev proxy in this Vite
 * setup the way there was with CRA. The web build is deployed on a
 * different domain than the backend (Vercel vs Render), so it needs an
 * absolute URL exactly as much as the native app does; relative requests
 * would silently 404 against Vercel's own static hosting.
 *
 * For local development on a physical Android device/emulator talking to a
 * backend running on your dev machine, VITE_API_URL must be your machine's
 * LAN IP (e.g. http://192.168.1.50:5000) or, for the Android emulator
 * specifically, http://10.0.2.2:5000 — never "localhost", because
 * "localhost" inside the APK refers to the phone itself, not your computer.
 */

import { Capacitor } from "@capacitor/core";

function resolveApiUrl() {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim().replace(/\/+$/, "");

  throw new Error(
    "VITE_API_URL is not set. Set it in frontend/.env — every build of " +
      "this app (web or Android) needs an explicit backend URL."
  );
}

export const API_URL = resolveApiUrl();
export const SOCKET_URL = API_URL;
export const IS_NATIVE = Capacitor.isNativePlatform();
export const PLATFORM = Capacitor.getPlatform(); // "android" | "ios" | "web"
