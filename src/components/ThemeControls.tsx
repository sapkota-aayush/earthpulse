"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, type AccentId } from "@/theme/ThemeContext";

const ACCENT_HEX: Record<AccentId, string> = {
  sky: "#38bdf8",
  emerald: "#34d399",
  violet: "#a78bfa",
  amber: "#fbbf24",
  rose: "#fb7185",
};

const ACCENTS: { id: AccentId; label: string }[] = [
  { id: "sky", label: "Ocean" },
  { id: "emerald", label: "Forest" },
  { id: "violet", label: "Nebula" },
  { id: "amber", label: "Solar" },
  { id: "rose", label: "Magma" },
];

export default function ThemeControls() {
  const { theme, accent, setTheme, setAccent, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-2xl p-4 w-[220px] shadow-2xl border border-[rgba(var(--accent-rgb),0.2)]"
          >
            <p className="text-[10px] font-mono tracking-widest uppercase text-theme-muted mb-3">Appearance</p>
            <p className="text-[11px] text-theme-muted mb-2 leading-snug">Modern dark and light palettes — tuned contrast and glass.</p>
            <div className="flex rounded-xl border border-theme-border overflow-hidden mb-4 p-0.5 bg-[color-mix(in_oklab,var(--surface-0)_40%,transparent)]">
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors rounded-lg ${theme === "dark" ? "bg-[color-mix(in_oklab,var(--surface-2)_90%,transparent)] text-accent shadow-sm border border-[rgba(var(--accent-rgb),0.2)]" : "text-theme-muted hover:text-theme-primary"}`}
              >
                Modern dark
              </button>
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors rounded-lg ${theme === "light" ? "bg-[color-mix(in_oklab,var(--surface-2)_90%,transparent)] text-accent shadow-sm border border-[rgba(var(--accent-rgb),0.2)]" : "text-theme-muted hover:text-theme-primary"}`}
              >
                Modern light
              </button>
            </div>
            <p className="text-[10px] font-mono tracking-widest uppercase text-theme-muted mb-2">Accent</p>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  title={a.label}
                  onClick={() => setAccent(a.id)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform ${
                    accent === a.id ? "border-[rgb(var(--accent-rgb))] scale-110 ring-2 ring-[rgba(var(--accent-rgb),0.35)]" : "border-theme-border opacity-85 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: ACCENT_HEX[a.id] }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="glass flex rounded-full border border-theme-border p-0.5 shadow-lg">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`px-3 sm:px-3.5 py-2 rounded-full text-[10px] sm:text-xs font-medium tracking-wide transition-colors ${theme === "dark" ? "bg-accent-muted text-accent border border-[rgba(var(--accent-rgb),0.35)]" : "text-theme-muted hover:text-theme-primary"}`}
            title="Modern dark"
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`px-3 sm:px-3.5 py-2 rounded-full text-[10px] sm:text-xs font-medium tracking-wide transition-colors ${theme === "light" ? "bg-accent-muted text-accent border border-[rgba(var(--accent-rgb),0.35)]" : "text-theme-muted hover:text-theme-primary"}`}
            title="Modern light"
          >
            Light
          </button>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="glass h-11 w-11 rounded-full border border-theme-border flex items-center justify-center text-theme-muted hover:text-accent transition-colors text-base"
          title={theme === "dark" ? "Quick toggle to light" : "Quick toggle to dark"}
        >
          {theme === "dark" ? "☾" : "☀"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="glass h-11 px-4 rounded-full border border-[rgba(var(--accent-rgb),0.25)] text-xs font-mono text-accent hover:bg-accent-muted transition-colors"
        >
          Accents
        </button>
      </div>
    </div>
  );
}
