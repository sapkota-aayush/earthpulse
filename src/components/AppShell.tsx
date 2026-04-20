"use client";

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
