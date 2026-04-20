"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { DeadZone } from "@/lib/deadZoneTypes";
import type { PlaceResearchPayload } from "@/lib/placeResearchTypes";

function threadStorageKey(zoneId: string) {
  return `ep:bb:thread:deadzone:${zoneId}`;
}

type Props = { zone: DeadZone };

/** Same `/api/place-research` pipeline as analyze; thread id stored per pin for follow-up continuity. */
export default function DeadZoneBackboardBrief({ zone }: Props) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<PlaceResearchPayload | null>(null);
  const [error, setError] = useState(false);
  const storageKey = threadStorageKey(zone.id);

  const fetchBrief = useCallback(
    (opts?: { reuseThread?: boolean }) => {
      setLoading(true);
      setError(false);
      const stored =
        typeof window !== "undefined" && opts?.reuseThread !== false
          ? window.localStorage.getItem(storageKey)
          : null;

      fetch("/api/place-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${zone.name}, ${zone.country}`,
          lat: zone.lat,
          lon: zone.lng,
          score: 52,
          aqiLabel: "Elevated / variable",
          greenCover: 26,
          population: 800_000,
          concretePercent: 38,
          contextThreadId: stored,
        }),
      })
        .then((r) => r.json())
        .then((j: PlaceResearchPayload) => {
          setPayload(j);
          if (j.contextThreadId && typeof window !== "undefined") {
            window.localStorage.setItem(storageKey, j.contextThreadId);
          }
        })
        .catch(() => {
          setPayload(null);
          setError(true);
        })
        .finally(() => setLoading(false));
    },
    [zone.country, zone.id, zone.lat, zone.lng, zone.name, storageKey]
  );

  useEffect(() => {
    fetchBrief();
  }, [fetchBrief]);

  const analyzeHref = `/analyze?lat=${zone.lat}&lon=${zone.lng}&name=${encodeURIComponent(zone.name)}`;

  return (
    <section
      aria-label="Brief for this stress pin"
      className="mt-10 rounded-2xl border border-theme-border bg-[color-mix(in_oklab,var(--surface-1)_88%,transparent)] px-5 py-6 sm:px-7 sm:py-7"
    >
      <div className="border-b border-theme-border pb-4 mb-5">
        <h2 className="text-lg font-semibold text-theme-primary leading-snug">What still moves near this pin</h2>
      </div>

      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 rounded bg-theme-border w-[85%] max-w-md" />
          <div className="h-3 rounded bg-theme-border w-full max-w-lg" />
          <div className="h-3 rounded bg-theme-border w-[70%] max-w-md" />
        </div>
      )}

      {!loading && error && (
        <p className="text-theme-faint text-sm font-mono">Brief unavailable — try again in a moment.</p>
      )}

      {!loading && payload && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-theme-primary leading-snug">{payload.localProblem}</h3>
            <p className="text-theme-muted text-sm mt-2 leading-relaxed max-w-prose">{payload.problemContext}</p>
          </div>
          <ul className="space-y-2 text-sm text-theme-muted max-w-prose border-l-2 border-[rgba(var(--accent-rgb),0.35)] pl-4">
            {payload.shortTerm.slice(0, 3).map((t, i) => (
              <li key={i} className="leading-snug">
                {t}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => fetchBrief({ reuseThread: true })}
              className="rounded-full border border-[rgba(var(--accent-rgb),0.35)] px-4 py-2 text-[11px] font-mono text-accent-soft hover:bg-accent-muted transition-colors"
            >
              Ask again
            </button>
            <Link
              href={analyzeHref}
              className="rounded-full bg-accent-muted border border-[rgba(var(--accent-rgb),0.45)] px-4 py-2 text-[11px] font-mono text-accent hover:brightness-110 transition-colors"
            >
              Full fork + sim →
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
