"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

export type ThemeMode = "dark" | "light";
export type AccentId = "sky" | "emerald" | "violet" | "amber" | "rose";

const STORAGE_THEME = "earthpulse-theme";
const STORAGE_ACCENT = "earthpulse-accent";

type Ctx = {
  theme: ThemeMode;
  accent: AccentId;
  setTheme: (t: ThemeMode) => void;
  setAccent: (a: AccentId) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<Ctx | null>(null);

function applyDom(theme: ThemeMode, accent: AccentId) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.accent = accent;
  try {
    localStorage.setItem(STORAGE_THEME, theme);
    localStorage.setItem(STORAGE_ACCENT, accent);
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeMode] = useState<ThemeMode>("dark");
  const [accent, setAccentId] = useState<AccentId>("sky");

  useLayoutEffect(() => {
    const root = document.documentElement;
    const t = root.dataset.theme === "light" ? "light" : "dark";
    const raw = root.dataset.accent as AccentId | undefined;
    const a: AccentId = ["sky", "emerald", "violet", "amber", "rose"].includes(raw ?? "") ? (raw as AccentId) : "sky";
    queueMicrotask(() => {
      setThemeMode(t);
      setAccentId(a);
    });
  }, []);

  useEffect(() => {
    applyDom(theme, accent);
  }, [theme, accent]);

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeMode(t);
  }, []);

  const setAccent = useCallback((a: AccentId) => {
    setAccentId(a);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode((p) => (p === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({ theme, accent, setTheme, setAccent, toggleTheme }),
    [theme, accent, setTheme, setAccent, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
