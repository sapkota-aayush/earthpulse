"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import DeadZoneBackboardBrief from "@/components/DeadZoneBackboardBrief";
import type { DeadZone } from "@/lib/deadZoneTypes";
import type { RelatedArticle } from "@/lib/deadZoneRelatedReading";

const CATEGORY_COLOR: Record<DeadZone["category"], string> = {
  nuclear: "#ef4444",
  industrial: "#f97316",
  deforestation: "#22c55e",
  climate: "#3b82f6",
  pollution: "#eab308",
  war: "#a855f7",
  extraction: "#d97706",
};

const CATEGORY_LABEL: Record<DeadZone["category"], string> = {
  nuclear: "NUCLEAR",
  industrial: "INDUSTRIAL",
  deforestation: "DEFORESTATION",
  climate: "CLIMATE",
  pollution: "POLLUTION",
  war: "WAR",
  extraction: "EXTRACTION",
};

/** What the before/after pair is meant to illustrate for this category (imagery is from orbit; captions give years). */
const ORBIT_SIGNAL: Record<DeadZone["category"], string> = {
  climate: "Temperature, rainfall, ice, or ocean heat leave fingerprints in colour, texture, and extent — years in the labels track the pair.",
  deforestation: "Canopy loss and fragmentation show up as sharp tone breaks and geometry changes across seasons or dry windows.",
  pollution: "Aerosols and surface films change reflectance; paired passes show how fast a plume can build or clear.",
  industrial: "Terrain reshaping, reservoirs, and infrastructure alter albedo and hydrology on multiyear timescales.",
  extraction: "Open pits, tailings, and thaw-related ground disturbance read as persistent scars against older baseline imagery.",
  nuclear: "Land use and exclusion zones can be read from vegetation recovery or permanent facility footprints between epochs.",
  war: "Burn scars, abandoned fields, and settlement damage can appear as spectral shifts — context matters alongside ground truth.",
};

function SeverityMeter({ level }: { level: 1 | 2 | 3 }) {
  const tier: Record<1 | 2 | 3, string> = { 1: "Elevated", 2: "High", 3: "Critical" };
  return (
    <div
      className="mt-2 rounded-lg px-3 py-3 border border-theme-border bg-[color-mix(in_oklab,var(--surface-1)_78%,transparent)]"
    >
      <div className="flex items-center gap-2" role="img" aria-label={`Impact level ${level} of 3`}>
        {([1, 2, 3] as const).map((i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full border shrink-0 transition-colors ${
              i <= level
                ? "border-[rgba(var(--accent-rgb),0.75)] bg-[rgba(var(--accent-rgb),0.5)] shadow-[0_0_10px_rgba(var(--accent-rgb),0.25)]"
                : "border-theme-border bg-[color-mix(in_oklab,var(--surface-1)_70%,transparent)]"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-theme-faint">{tier[level]}</p>
    </div>
  );
}

/** Normalize story text and split into paragraphs for readable blocks. */
function storyToParagraphs(raw: string): string[] {
  const cleaned = raw.replace(/\.{3,}/g, "…").replace(/\.{2}/g, ".").trim();
  const byBlank = cleaned.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (byBlank.length > 1) return byBlank;

  const one = byBlank[0] ?? cleaned;
  if (one.length < 420) return [one];

  const sentences = one.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length < 4) return [one];

  const out: string[] = [];
  let buf = "";
  for (const s of sentences) {
    const next = buf ? `${buf} ${s}` : s;
    if (buf && next.length > 360) {
      out.push(buf.trim());
      buf = s;
    } else {
      buf = next;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.length ? out : [one];
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className ?? "h-4 w-4 shrink-0 opacity-65"}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5M16.5 3h6m0 0v6m0-6L10.5 16.5"
      />
    </svg>
  );
}

export default function DeadZoneDetailClient({ zone }: { zone: DeadZone }) {
  const [story, setStory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reading, setReading] = useState<{
    source: "gemini" | "anthropic" | "offline";
    links: RelatedArticle[];
  } | null>(null);
  const [readingLoading, setReadingLoading] = useState(true);
  const cat = CATEGORY_COLOR[zone.category];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setStory(null);
    fetch("/api/dead-zone-story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: zone.id,
        name: zone.name,
        country: zone.country,
        category: zone.category,
        culprit: zone.culprit,
        yearOfDamage: zone.yearOfDamage,
        tagline: zone.tagline,
        casualties: zone.casualties,
        areaKm2: zone.areaKm2,
      }),
    })
      .then((r) => r.json())
      .then((j: { story: string }) => {
        if (!cancelled) setStory(j.story);
      })
      .catch(() => {
        if (!cancelled) setStory(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [zone.id]);

  useEffect(() => {
    let cancelled = false;
    setReadingLoading(true);
    setReading(null);
    fetch("/api/dead-zone-reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: zone.id,
        name: zone.name,
        country: zone.country,
        yearOfDamage: zone.yearOfDamage,
        category: zone.category,
        culprit: zone.culprit,
        tagline: zone.tagline,
      }),
    })
      .then((r) => r.json())
      .then((j: { source?: string; links?: RelatedArticle[] }) => {
        if (cancelled) return;
        if (j?.links?.length) {
          const src = j.source === "gemini" ? "gemini" : j.source === "anthropic" ? "anthropic" : "offline";
          setReading({ source: src, links: j.links });
        } else {
          setReading(null);
        }
      })
      .catch(() => {
        if (!cancelled) setReading(null);
      })
      .finally(() => {
        if (!cancelled) setReadingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [zone.id]);

  return (
    <div className="min-h-screen theme-bg theme-fg pb-16">
      <header className="sticky top-0 z-20 border-b border-theme-border bg-[color-mix(in_oklab,var(--surface-0)_92%,transparent)] backdrop-blur-md px-5 py-4 flex items-center justify-between gap-4">
        <Link href="/" className="text-theme-faint hover:text-accent text-xs font-mono transition-colors">
          ← EarthPulse
        </Link>
        <span
          className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border"
          style={{ borderColor: `${cat}55`, color: cat, background: `${cat}14` }}
        >
          {CATEGORY_LABEL[zone.category]}
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-5 pt-10 pb-6">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-theme-primary uppercase leading-tight">
          {zone.name}
        </h1>
        <p className="mt-3 text-theme-muted text-sm sm:text-base italic leading-relaxed max-w-prose">
          {zone.tagline}
        </p>
        <p className="mt-2 text-theme-faint text-xs font-mono tracking-wide">{zone.country}</p>

        <div className="mt-8 rounded-2xl border border-theme-border overflow-hidden">
          <BeforeAfterSlider
            beforeSrc={zone.beforeImage}
            afterSrc={zone.afterImage}
            beforeLabel={`Before ${zone.beforeYear}`}
            afterLabel={`After ${zone.afterYear}`}
          />
        </div>

        <section
          aria-label="Satellite context"
          className="mt-8 rounded-2xl border border-theme-border bg-[color-mix(in_oklab,var(--surface-1)_86%,transparent)] px-5 py-6 sm:px-7 sm:py-7"
        >
          <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent-soft mb-4">
            From orbit — before and after
          </h2>
          <p className="text-theme-muted text-sm sm:text-[15px] leading-relaxed max-w-prose">
            {ORBIT_SIGNAL[zone.category]} This page pairs two NASA Earth-observation–style frames so you can scrub
            between <span className="text-theme-primary tabular-nums">{zone.beforeYear}</span> and{" "}
            <span className="text-theme-primary tabular-nums">{zone.afterYear}</span> while reading the culprit line and
            the story below.
          </p>
          {zone.id.startsWith("cw-") && (
            <p className="mt-4 text-theme-faint text-xs font-mono leading-relaxed max-w-prose border-t border-theme-border pt-4">
              Climate-watch pin: the slider uses a vetted regional exemplar (same sensor family where possible) to
              show the process named in the headline — not always the exact footprint of the map dot, which marks the
              wider stressed region.
            </p>
          )}
          <ul className="mt-5 space-y-2.5 text-theme-muted text-sm max-w-prose list-disc pl-5 marker:text-theme-faint">
            <li>
              <span className="text-theme-primary">Coordinates on file</span> — the globe marker is at the listed
              latitude and longitude in the footer; use them with the stress report link for local context.
            </li>
            <li>
              <span className="text-theme-primary">Why two years</span> — the damage year is the narrative anchor; the
              image years are when those passes best show the change process for this category.
            </li>
          </ul>
        </section>

        <section
          aria-label="Key facts"
          className="mt-10 rounded-2xl border border-theme-border bg-[color-mix(in_oklab,var(--surface-1)_88%,transparent)] overflow-hidden"
        >
          <div className="border-b border-theme-border px-5 py-4 sm:px-6 sm:py-5">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-theme-faint mb-2">Culprit</h2>
            <p className="text-theme-primary text-[15px] sm:text-base leading-relaxed max-w-prose">
              {zone.culprit}
            </p>
          </div>
          <dl className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-theme-border">
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <dt className="text-[10px] font-mono uppercase tracking-[0.18em] text-theme-faint">Year</dt>
              <dd className="mt-2 text-lg sm:text-xl font-semibold tabular-nums text-theme-primary tracking-tight">
                {zone.yearOfDamage}
              </dd>
            </div>
            <div className="px-5 py-4 sm:px-6 sm:py-5">
              <dt className="text-[10px] font-mono uppercase tracking-[0.18em] text-theme-faint">Impact</dt>
              <dd className="mt-0">
                <SeverityMeter level={zone.severity} />
              </dd>
            </div>
            {zone.areaKm2 != null && (
              <div className="px-5 py-4 sm:px-6 sm:py-5">
                <dt className="text-[10px] font-mono uppercase tracking-[0.18em] text-theme-faint">Area</dt>
                <dd className="mt-2 text-lg sm:text-xl font-semibold tabular-nums text-theme-primary tracking-tight">
                  {zone.areaKm2.toLocaleString()}
                  <span className="text-sm font-normal text-theme-muted"> km²</span>
                </dd>
              </div>
            )}
            {zone.casualties != null && (
              <div className="px-5 py-4 sm:px-6 sm:py-5">
                <dt className="text-[10px] font-mono uppercase tracking-[0.18em] text-theme-faint">Casualties</dt>
                <dd className="mt-2 text-lg sm:text-xl font-semibold tabular-nums text-theme-primary tracking-tight">
                  {zone.casualties.toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <DeadZoneBackboardBrief zone={zone} />

        <section className="mt-10 rounded-2xl border border-theme-border bg-[color-mix(in_oklab,var(--surface-1)_85%,transparent)] px-5 py-6 sm:px-7 sm:py-8">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent-soft mb-5 pb-3 border-b border-theme-border">
            The story
          </h2>
          {loading ? (
            <div className="space-y-3 animate-pulse max-w-prose">
              <div className="h-3.5 rounded bg-theme-border w-[92%]" />
              <div className="h-3.5 rounded bg-theme-border w-full" />
              <div className="h-3.5 rounded bg-theme-border w-[88%]" />
              <div className="h-3.5 rounded bg-theme-border w-[76%]" />
            </div>
          ) : story ? (
            <div className="max-w-prose space-y-5 text-theme-muted text-[15px] sm:text-base leading-[1.75]">
              {storyToParagraphs(story).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : (
            <p className="text-theme-faint text-sm font-mono">— No narrative on file —</p>
          )}
        </section>

        {(readingLoading || (reading && reading.links.length > 0)) && (
          <section
            aria-label="Further reading"
            className="mt-10 rounded-2xl border border-theme-border bg-[color-mix(in_oklab,var(--surface-1)_88%,transparent)] overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-theme-border px-5 py-4 sm:px-6">
              <h2 className="text-[10px] font-mono uppercase tracking-[0.22em] text-accent-soft">Read further</h2>
              {!readingLoading && reading?.source === "gemini" && (
                <span className="text-[9px] font-mono uppercase tracking-wider text-theme-faint px-2 py-1 rounded-md border border-theme-border bg-[color-mix(in_oklab,var(--surface-0)_70%,transparent)]">
                  Gemini + Google Search
                </span>
              )}
              {!readingLoading && reading?.source === "anthropic" && (
                <span className="text-[9px] font-mono uppercase tracking-wider text-theme-faint px-2 py-1 rounded-md border border-theme-border bg-[color-mix(in_oklab,var(--surface-0)_70%,transparent)]">
                  Claude links
                </span>
              )}
              {!readingLoading && reading?.source === "offline" && (
                <span className="text-[9px] font-mono uppercase tracking-wider text-theme-faint px-2 py-1 rounded-md border border-theme-border">
                  Curated search links
                </span>
              )}
            </div>
            <div className="p-4 sm:p-5">
              {readingLoading ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <li
                      key={i}
                      className="h-[3.25rem] rounded-xl border border-theme-border bg-theme-border/25 animate-pulse"
                    />
                  ))}
                </ul>
              ) : reading ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {reading.links.map((item) => (
                    <li key={item.url}>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex h-full min-h-[3.25rem] flex-col justify-center gap-0.5 rounded-xl border border-theme-border bg-[color-mix(in_oklab,var(--surface-0)_55%,transparent)] px-3.5 py-3 transition-colors hover:border-[rgba(var(--accent-rgb),0.35)] hover:bg-[color-mix(in_oklab,var(--surface-0)_88%,transparent)]"
                      >
                        <span className="flex items-start gap-2">
                          <ExternalLinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent-soft opacity-80 group-hover:opacity-100" />
                          <span className="text-[13px] sm:text-sm font-medium text-theme-primary leading-snug line-clamp-2">
                            {item.title}
                          </span>
                        </span>
                        <span className="pl-6 text-[10px] font-mono uppercase tracking-wide text-theme-faint truncate">
                          {item.source}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        )}

        <footer className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 pt-6 border-t border-theme-border">
          <p className="text-theme-faint text-xs font-mono tabular-nums shrink-0">
            {zone.lat >= 0 ? `${zone.lat.toFixed(4)}°N` : `${Math.abs(zone.lat).toFixed(4)}°S`}
            <span className="text-theme-border mx-2">·</span>
            {zone.lng >= 0 ? `${zone.lng.toFixed(4)}°E` : `${Math.abs(zone.lng).toFixed(4)}°W`}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-[rgba(var(--accent-rgb),0.35)] px-5 py-2.5 text-xs font-mono text-accent-soft hover:bg-accent-muted transition-colors"
            >
              Back to globe
            </Link>
            <Link
              href={`/analyze?lat=${zone.lat}&lon=${zone.lng}&name=${encodeURIComponent(zone.name)}`}
              className="inline-flex items-center justify-center rounded-full bg-accent-muted border border-[rgba(var(--accent-rgb),0.45)] px-5 py-2.5 text-xs font-mono text-accent hover:brightness-110 transition-colors"
            >
              Open stress report →
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
