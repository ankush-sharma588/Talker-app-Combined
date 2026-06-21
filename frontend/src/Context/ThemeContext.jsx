import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../config/api";

export const ACCENT_COLORS = [
  { name: "Violet",  hex: "#7c3aed", light: "#6d28d9" },
  { name: "Blue",    hex: "#3b82f6", light: "#2563eb" },
  { name: "Emerald", hex: "#10b981", light: "#059669" },
  { name: "Rose",    hex: "#f43f5e", light: "#e11d48" },
  { name: "Amber",   hex: "#f59e0b", light: "#d97706" },
  { name: "Cyan",    hex: "#06b6d4", light: "#0891b2" },
  { name: "Pink",    hex: "#ec4899", light: "#db2777" },
  { name: "Indigo",  hex: "#6366f1", light: "#4f46e5" },
];

export const CHAT_BACKGROUNDS = [
  {
    id: "default",
    name: "Default",
    preview: null,
    style: (colors) => ({ background: colors.chatBg }),
  },
  {
    id: "dots",
    name: "Dots",
    preview: "dots",
    style: (colors) => ({
      background: colors.chatBg,
      backgroundImage: `radial-gradient(${colors.accent}33 1.5px, transparent 1.5px)`,
      backgroundSize: "20px 20px",
    }),
  },
  {
    id: "grid",
    name: "Grid",
    preview: "grid",
    style: (colors) => ({
      background: colors.chatBg,
      backgroundImage: `linear-gradient(${colors.accent}22 1px, transparent 1px), linear-gradient(90deg, ${colors.accent}22 1px, transparent 1px)`,
      backgroundSize: "24px 24px",
    }),
  },
  {
    id: "bubbles",
    name: "Bubbles",
    preview: "bubbles",
    style: (colors) => ({
      background: `radial-gradient(ellipse at 20% 80%, ${colors.accent}18 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, ${colors.accent}14 0%, transparent 50%), ${colors.chatBg}`,
    }),
  },
  {
    id: "waves",
    name: "Waves",
    preview: "waves",
    style: (colors) => ({
      background: colors.chatBg,
      backgroundImage: `repeating-linear-gradient(45deg, ${colors.accent}0d 0, ${colors.accent}0d 1px, transparent 0, transparent 50%)`,
      backgroundSize: "16px 16px",
    }),
  },
  {
    id: "gradient",
    name: "Gradient",
    preview: "gradient",
    style: (colors) => ({
      background: `linear-gradient(135deg, ${colors.chatBg} 0%, ${colors.accent}22 50%, ${colors.chatBg} 100%)`,
    }),
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    preview: "cyberpunk",
    style: () => ({
      background: "#050510",
      backgroundImage: `
        linear-gradient(rgba(184,75,255,0.07) 1px, transparent 1px),
        linear-gradient(90deg, rgba(59,130,246,0.07) 1px, transparent 1px)
      `,
      backgroundSize: "32px 32px",
    }),
  },
];

function hexWithOpacity(hex, opacity) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

function buildColors(isDark, accent, isCyberpunk) {
  if (isCyberpunk) {
    return {
      bg:               "#050510",
      sidebar:          "#0a0a1a",
      header:           "#080815",
      chatBg:           "#050510",
      border:           "#b84bff44",
      text:             "#e8d5ff",
      subText:          "#7857aa",
      chatItem:         "#0e0e20",
      chatItemSelected: "rgba(184,75,255,0.18)",
      chatItemHover:    "#12122a",
      inputBg:          "#0e0e20",
      myMessage:        "linear-gradient(135deg, #7c3aed, #3b82f6)",
      otherMessage:     "#12122a",
      modalBg:          "#0a0a1a",
      buttonBg:         "#0e0e20",
      accent:           "#b84bff",
      accentHover:      "#c96bff",
      accentDim:        "rgba(184,75,255,0.12)",
      scrollThumb:      "#b84bff88",
      typingBg:         "#12122a",
      shadow:           "0 4px 32px rgba(184,75,255,0.25), 0 0 64px rgba(59,130,246,0.1)",
      badgeBg:          "#b84bff",
      // Cyberpunk extras
      neonGlow:         "0 0 10px #b84bff, 0 0 20px #7c3aed55",
      headerGradient:   "linear-gradient(135deg, #080815, #0a0a22)",
      accentGradient:   "linear-gradient(135deg, #b84bff, #3b82f6)",
      borderAnimated:   true,
    };
  }

  return isDark
    ? {
        bg:               "#0f0f17",
        sidebar:          "#141420",
        header:           "#141420",
        chatBg:           "#0d0d14",
        border:           "#1e1e2e",
        text:             "#e2e8f0",
        subText:          "#6b7280",
        chatItem:         "#1a1a28",
        chatItemSelected: hexWithOpacity(accent, 0.25),
        chatItemHover:    "#1a1a28",
        inputBg:          "#1a1a28",
        myMessage:        hexWithOpacity(accent, 0.75),
        otherMessage:     "#1e1e2e",
        modalBg:          "#141420",
        buttonBg:         "#1a1a28",
        accent,
        accentHover:      hexWithOpacity(accent, 0.85),
        accentDim:        hexWithOpacity(accent, 0.15),
        scrollThumb:      hexWithOpacity(accent, 0.5),
        typingBg:         "#1e1e2e",
        shadow:           "0 4px 24px rgba(0,0,0,0.5)",
        badgeBg:          accent,
        borderAnimated:   false,
      }
    : {
        bg:               "#f5f5f8",
        sidebar:          "#ffffff",
        header:           "#ffffff",
        chatBg:           "#f0f0f5",
        border:           "#e2e8f0",
        text:             "#1a202c",
        subText:          "#718096",
        chatItem:         "#f5f5f8",
        chatItemSelected: hexWithOpacity(accent, 0.12),
        chatItemHover:    "#f0f0f5",
        inputBg:          "#f0f0f5",
        myMessage:        hexWithOpacity(accent, 0.85),
        otherMessage:     "#ffffff",
        modalBg:          "#ffffff",
        buttonBg:         "#f0f0f5",
        accent,
        accentHover:      hexWithOpacity(accent, 0.9),
        accentDim:        hexWithOpacity(accent, 0.1),
        scrollThumb:      hexWithOpacity(accent, 0.4),
        typingBg:         "#f0f0f5",
        shadow:           "0 4px 24px rgba(0,0,0,0.08)",
        badgeBg:          accent,
        borderAnimated:   false,
      };
}

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem("talker-mode") !== "light"
  );
  const [accent, setAccentState] = useState(
    () => localStorage.getItem("talker-accent") || "#7c3aed"
  );
  const [background, setBackgroundState] = useState(
    () => localStorage.getItem("talker-background") || "default"
  );
  const [isCyberpunk, setIsCyberpunkState] = useState(
    () => localStorage.getItem("talker-cyberpunk") === "true"
  );
  const [isSaving, setIsSaving] = useState(false);

  // Apply/remove cyberpunk body class
  useEffect(() => {
    if (isCyberpunk) {
      document.body.classList.add("cyberpunk-theme");
    } else {
      document.body.classList.remove("cyberpunk-theme");
    }
  }, [isCyberpunk]);

  // Save theme to backend DB
  const saveThemeToDb = useCallback(async (mode, accentVal, backgroundVal) => {
    try {
      const userInfo = JSON.parse(localStorage.getItem("userInfo"));
      if (!userInfo?.token) return;
      setIsSaving(true);
      await api.put(
        "/api/user/theme",
        { mode, accent: accentVal, background: backgroundVal },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
    } catch (err) {
      console.error("Failed to save theme:", err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Load theme from backend on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const userInfo = JSON.parse(localStorage.getItem("userInfo"));
        if (!userInfo?.token) return;

        if (userInfo.theme) {
          const { mode, accent: a, background: bg } = userInfo.theme;
          const dark = mode !== "light";
          setIsDarkMode(dark);
          setAccentState(a || "#7c3aed");
          setBackgroundState(bg || "default");
          localStorage.setItem("talker-mode", dark ? "dark" : "light");
          localStorage.setItem("talker-accent", a || "#7c3aed");
          localStorage.setItem("talker-background", bg || "default");
          return;
        }

        const { data } = await api.get("/api/user/theme", {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        if (data.theme) {
          const { mode, accent: a, background: bg } = data.theme;
          const dark = mode !== "light";
          setIsDarkMode(dark);
          setAccentState(a || "#7c3aed");
          setBackgroundState(bg || "default");
          localStorage.setItem("talker-mode", dark ? "dark" : "light");
          localStorage.setItem("talker-accent", a || "#7c3aed");
          localStorage.setItem("talker-background", bg || "default");
        }
      } catch (err) {
        // Silent fail
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      const mode = next ? "dark" : "light";
      localStorage.setItem("talker-mode", mode);
      saveThemeToDb(mode, accent, background);
      return next;
    });
  };

  const setAccent = (hex) => {
    setAccentState(hex);
    localStorage.setItem("talker-accent", hex);
    const mode = isDarkMode ? "dark" : "light";
    saveThemeToDb(mode, hex, background);
  };

  const setBackground = (bgId) => {
    setBackgroundState(bgId);
    localStorage.setItem("talker-background", bgId);
    const mode = isDarkMode ? "dark" : "light";
    saveThemeToDb(mode, accent, bgId);
  };

  const toggleCyberpunk = () => {
    setIsCyberpunkState((prev) => {
      const next = !prev;
      localStorage.setItem("talker-cyberpunk", String(next));
      return next;
    });
  };

  const colors = buildColors(isDarkMode, accent, isCyberpunk);

  const currentBg = CHAT_BACKGROUNDS.find((b) => b.id === background) || CHAT_BACKGROUNDS[0];
  const chatBackgroundStyle = currentBg.style(colors);

  // Sync CSS variables
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty("--accent", colors.accent);
    r.setProperty("--accent-dim", colors.accentDim);
    r.setProperty("--chat-bg", colors.chatBg);
    r.setProperty("--scroll-thumb", colors.scrollThumb);
    if (isCyberpunk) {
      r.setProperty("--cyber-glow", colors.neonGlow || "");
      r.setProperty("--cyber-border-color", "#b84bff");
    }
  }, [colors, isCyberpunk]);

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode, toggleTheme,
        accent, setAccent,
        background, setBackground,
        chatBackgroundStyle,
        colors,
        ACCENT_COLORS,
        CHAT_BACKGROUNDS,
        isSaving,
        isCyberpunk, toggleCyberpunk,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
