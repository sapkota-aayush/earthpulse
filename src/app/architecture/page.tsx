// Static marketing / submission diagram: logos embedded via simple-icons package.
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import type { SimpleIcon } from "simple-icons";
import {
  siAndroid,
  siFramer,
  siGithub,
  siGoogle,
  siGooglechrome,
  siNextdotjs,
  siOpenai,
  siOpenstreetmap,
  siReact,
  siTailwindcss,
  siThreedotjs,
  siTypescript,
  siVercel,
} from "simple-icons";

export const metadata: Metadata = {
  title: "EarthPulse — System architecture",
  description:
    "EarthPulse: browser → Vercel → Next.js → API routes → IBM watsonx, weather, maps, and integrations.",
};

function BrandIcon({ icon, label, hint }: { icon: SimpleIcon; label: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <svg
        viewBox="0 0 24 24"
        width={40}
        height={40}
        role="img"
        className="shrink-0"
        aria-hidden
      >
        <title>{hint ?? label}</title>
        <path fill={`#${icon.hex}`} d={icon.path} />
      </svg>
      <span className="max-w-[6.5rem] text-[11px] font-semibold leading-snug text-[var(--text-primary)]">
        {label}
      </span>
    </div>
  );
}

/** IBM brand uses 8-bar mark (widely recognized); IBM SVG was removed from Simple Icons CDN. */
function IbmWatsonxTile() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <svg viewBox="0 0 88 32" width={72} height={28} className="shrink-0" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x={i * 11} y={0} width={9} height={32} rx={0.5} fill="#0f62fe" />
        ))}
      </svg>
      <span className="max-w-[8rem] text-[11px] font-semibold leading-snug text-[var(--text-primary)]">
        IBM watsonx.ai
      </span>
      <span className="text-[9px] text-[var(--text-faint)]">Narratives</span>
    </div>
  );
}

/** OpenWeatherMap icon removed from Simple Icons; neutral weather mark. */
function OpenWeatherTile() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <svg viewBox="0 0 48 48" width={44} height={44} className="shrink-0" aria-hidden>
        <circle cx="36" cy="12" r={9} fill="#FFB300" />
        <path
          d="M10 38h30c6.1 0 11-4.9 11-11a11 11 0 00-11-11h-1.5A13.5 13.5 0 0033 5 13.5 13.5 0 0019.5 17 9 9 0 00-2 17.8A10 10 0 0010 38z"
          fill="#5EB6E8"
        />
      </svg>
      <span className="max-w-[6.5rem] text-[11px] font-semibold leading-snug text-[var(--text-primary)]">
        OpenWeather
      </span>
      <span className="text-[9px] text-[var(--text-faint)]">AQI (optional)</span>
    </div>
  );
}

function OpenMeteoTile() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border [background:#132e1f]"
        style={{ borderColor: "var(--border-strong)" }}
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
          <circle cx="12" cy="13" r={5} fill="#ffd54f" />
          <path
            d="M4 19h16a4 4 0 00-4-5H8a4 4 0 00-4 5z"
            fill="rgba(255,255,255,0.92)"
          />
        </svg>
      </div>
      <span className="max-w-[6.5rem] text-[11px] font-semibold leading-snug text-[var(--text-primary)]">
        Open-Meteo
      </span>
      <span className="text-[9px] text-[var(--text-faint)]">Weather API</span>
    </div>
  );
}

function GlobeGlTile() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border [background:var(--surface-2)]"
        style={{ borderColor: "var(--border-strong)" }}
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7 text-[rgb(var(--accent-rgb))]" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="12" cy="12" rx="4" ry="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M2 12h20M12 2c-2 3.5-2 16.5 0 20M12 2c2 3.5 2 16.5 0 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className="max-w-[6rem] text-[11px] font-semibold text-[var(--text-primary)]">globe.gl</span>
      <span className="text-[9px] text-[var(--text-faint)]">3D globe</span>
    </div>
  );
}

function Col({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-4 rounded-2xl border px-5 py-6 [background:var(--surface-1)] ${className}`}
      style={{ borderColor: "var(--border-strong)" }}
    >
      <div className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        {title}
      </div>
      <div className="flex flex-1 flex-wrap content-center justify-center gap-x-6 gap-y-5">{children}</div>
    </div>
  );
}

function Arrow({ horizontal }: { horizontal?: boolean }) {
  if (horizontal) {
    return (
      <div
        className="hidden w-8 shrink-0 items-center justify-center self-center xl:flex"
        aria-hidden
      >
        <svg width="28" height="20" viewBox="0 0 28 20" className="text-[var(--text-faint)]">
          <path d="M2 10h22m0 0-6-6m6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex justify-center py-2 xl:hidden" aria-hidden>
      <svg width="22" height="26" viewBox="0 0 22 26" className="text-[var(--text-faint)]">
        <path d="M11 3v16m0 0-6-6m6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function MiniApi({ path, note }: { path: string; note: string }) {
  return (
    <div
      className="rounded-xl border px-3 py-3 [background:var(--surface-2)]"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="font-mono text-[11px] font-semibold text-[var(--text-primary)]">{path}</div>
      <div className="mt-1 text-[10px] leading-relaxed text-[var(--text-muted)]">{note}</div>
    </div>
  );
}

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen theme-bg theme-fg">
      <div
        className="mx-auto max-w-[1320px] px-5 py-8 md:px-8 md:py-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.055) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      >
        <header className="mb-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--text-muted)]">
            System design
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text-primary)] md:text-3xl">
            EarthPulse architecture
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
            One screen for docs: traffic flows left to right; APIs and outbound services below. Logos are embedded
            (no external image CDN). Screenshot for Devpost or GitHub.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block text-sm font-medium underline decoration-sky-500/40 underline-offset-4 [color:rgb(var(--accent-rgb))]"
          >
            ← Back to app
          </Link>
        </header>

        <div className="flex flex-col xl:flex-row xl:items-stretch xl:justify-center">
          <Col title="1 — Clients" className="xl:min-h-[220px] xl:flex-1">
            <BrandIcon icon={siGooglechrome} label="Web browser" hint="Browser clients" />
            <BrandIcon icon={siAndroid} label="Mobile web" hint="Responsive WebGL" />
          </Col>
          <Arrow horizontal />

          <Col title="2 — Edge & host" className="xl:min-h-[220px] xl:flex-1">
            <BrandIcon icon={siVercel} label="Vercel" hint="Edge, TLS, CDN" />
            <BrandIcon icon={siGithub} label="GitHub" hint="Repository & CI" />
          </Col>
          <Arrow horizontal />

          <Col title="3 — Application" className="xl:min-h-[220px] xl:flex-[1.2]">
            <BrandIcon icon={siNextdotjs} label="Next.js 16" hint="App Router" />
            <BrandIcon icon={siReact} label="React 19" hint="UI" />
            <BrandIcon icon={siTypescript} label="TypeScript" hint="Types" />
            <BrandIcon icon={siTailwindcss} label="Tailwind v4" hint="Styles" />
          </Col>
          <Arrow horizontal />

          <Col title="4 — 3D & motion" className="xl:min-h-[220px] xl:flex-1">
            <BrandIcon icon={siThreedotjs} label="Three.js" hint="WebGL" />
            <GlobeGlTile />
            <BrandIcon icon={siFramer} label="Framer Motion" hint="Motion" />
          </Col>
        </div>

        <div className="py-4 xl:py-6" aria-hidden />

        <div className="flex flex-col gap-8 xl:flex-row xl:gap-10">
          <section
            className="flex min-w-0 flex-1 flex-col gap-5 rounded-2xl border p-7 [background:var(--surface-1)]"
            style={{ borderColor: "var(--border-strong)" }}
          >
            <div className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              5 — Serverless API routes
            </div>
            <p className="text-center text-xs leading-relaxed text-[var(--text-muted)]">
              Next.js route handlers · secrets from Vercel env
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MiniApi path="GET /api/analyze" note="Stress report, weather, optional AQI" />
              <MiniApi path="GET /api/satellite" note="Map still / bbox" />
              <MiniApi path="POST /api/dead-zone-story" note="AI narrative (IBM watsonx, then Gemini…)" />
              <MiniApi path="POST /api/dead-zone-reading" note="Reading links" />
              <MiniApi path="POST /api/plan" note="Climate plan panel" />
              <MiniApi path="POST /api/place-research" note="Place research brief" />
            </div>
          </section>

          <section
            className="flex min-w-0 flex-1 flex-col gap-6 rounded-2xl border p-7 [background:var(--surface-1)]"
            style={{ borderColor: "var(--border-strong)" }}
          >
            <div className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              6 — Data & AI (outbound HTTPS)
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 place-items-center">
              <IbmWatsonxTile />
              <BrandIcon icon={siGoogle} label="Google Gemini" hint="Plans, reading" />
              <BrandIcon icon={siOpenai} label="OpenAI" hint="Place research" />
              <OpenMeteoTile />
              <OpenWeatherTile />
              <BrandIcon icon={siOpenstreetmap} label="OSM / Nominatim" hint="Geocoding, tiles" />
              <div className="col-span-2 flex flex-col items-center gap-2 text-center sm:col-span-1">
                <code className="rounded-lg bg-[var(--surface-2)] px-3 py-2 font-mono text-[10px] text-[var(--text-muted)]">
                  src/lib/deadZones*.ts
                </code>
                <span className="text-[11px] font-semibold text-[var(--text-primary)]">Curated catalogue</span>
                <span className="text-[9px] text-[var(--text-faint)]">Shipped in app</span>
              </div>
            </div>
          </section>
        </div>

        <footer
          className="mt-10 border-t pt-6 text-center text-[10px] leading-relaxed text-[var(--text-faint)]"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          Icons from Simple Icons (MIT) where available · IBM / OpenWeather use diagram marks · EarthPulse · Build for
          the Planet
        </footer>
      </div>
    </main>
  );
}
