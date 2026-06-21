import { useEffect, useState } from "react";

/**
 * Returns the real visible viewport height in pixels, kept in sync with
 * window.innerHeight on resize (keyboard open/close, rotation, etc).
 *
 * Why this exists instead of just using CSS `100vh` or `100dvh`:
 * - `100vh` does not shrink when the Android on-screen keyboard opens,
 *   so the bottom of the screen (chat input, login button) ends up hidden
 *   behind the keyboard.
 * - `100dvh` fixes that, but only on WebView versions that support it.
 *   Android WebView ships as a separate updatable app tied to Play Store
 *   updates, not the OS version — plenty of real devices in the field run
 *   versions where `dvh` is not supported and silently computes as 0,
 *   collapsing the whole layout.
 * - Measuring `window.innerHeight` in JS works on every Android WebView
 *   version ever shipped, so it is the reliable baseline; CSS dvh is kept
 *   as a progressive enhancement on top of it, not the only mechanism.
 */
export function useViewportHeight() {
  const [height, setHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 0
  );

  useEffect(() => {
    const update = () => setHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return height;
}
