import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"] });

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('earthpulse-theme') || 'dark';
    var a = localStorage.getItem('earthpulse-accent') || 'sky';
    document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.accent = a;
  } catch (e) {}
})();`;

export const metadata: Metadata = {
  title: "EarthPulse — Your Planet, Your Responsibility",
  description:
    "Before-and-after views of stressed places — climate, industry, conflict — so we remember what we have done to our surroundings.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} min-h-full antialiased`} suppressHydrationWarning>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
