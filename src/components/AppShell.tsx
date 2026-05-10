"use client";
// Wraps all pages with theme context and floating appearance controls.

import { ThemeProvider } from "@/theme/ThemeContext";
import ThemeControls from "@/components/ThemeControls";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <ThemeControls />
    </ThemeProvider>
  );
}
