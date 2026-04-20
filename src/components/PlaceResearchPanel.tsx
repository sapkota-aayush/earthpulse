"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import type { PlaceResearchPayload } from "@/lib/placeResearchTypes";

const RESEARCH_STEPS = [
  "Scanning recent reporting for your area…",
  "Cross-checking satellite-style signals (trees, concrete, AQI)…",
  "Matching stress patterns to what neighbours can actually shift…",
  "Pulling vetted giving ideas and practical shopping nudges…",
  "Compressing into a short brief (no essay)…",
  "Final pass — verifying links look real…",
];

type Metrics = {
  name: string;
  lat: number;
  lon: number;
  score: number;
  aqiLabel: string;
  greenCover: number;
  population: number;
  concretePercent: number;
};

export default function PlaceResearchPanel({ metrics }: { metrics: Metrics }) {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<PlaceResearchPayload | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const { name, lat, lon, score, aqiLabel, greenCover, population, concretePercent } = metrics;

  useEffect(() => {
    if (!loading) {
      if (stepTimer.current) clearInterval(stepTimer.current);
      stepTimer.current = null;
      return;
    }
    setStepIdx(0);
    if (stepTimer.current) clearInterval(stepTimer.current);
    stepTimer.current = setInterval(() => {
      setStepIdx((i) => (i + 1) % RESEARCH_STEPS.length);
    }, 10_000);
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
      stepTimer.current = null;
    };
  }, [loading, name, lat, lon]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPayload(null);
    fetch("/api/place-research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        lat,
        lon,
        score,
        aqiLabel,
        greenCover,
        population,
        concretePercent,
      }),
    })
      .then((r) => r.json())
      .then((j: PlaceResearchPayload) => {
        if (!cancelled) setPayload(j);
      })
      .catch(() => {
        if (!cancelled) setPayload(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name, lat, lon, score, aqiLabel, greenCover, population, concretePercent]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass rounded-3xl p-5 sm:p-6 mb-6 border border-[rgba(var(--accent-rgb),0.12)]"
    >
      <p className="text-accent-soft text-[10px] font-mono tracking-[0.28em] uppercase mb-1">Your area</p>
      <h2 className="text-lg sm:text-xl font-semibold text-theme-primary">Small actions, real pressure points</h2>
      <p className="text-theme-muted text-xs sm:text-sm mt-1 max-w-xl">
        We highlight one local-style environmental stress and simple ways to help — short-term habits and longer civic or home choices.
      </p>

      {loading && (
        <div className="mt-5 rounded-xl border border-theme-border bg-[color-mix(in_oklab,var(--surface-1)_55%,transparent)] px-4 py-5 min-h-[5.5rem] flex flex-col justify-center gap-2">
          <p className="text-theme-muted text-sm leading-snug transition-opacity duration-300">{RESEARCH_STEPS[stepIdx]}</p>
          <p className="text-theme-faint text-[11px] font-mono">Live research can take up to ~1 minute — we wait for web results when your API key is set.</p>
          <div className="flex gap-1 pt-1">
            {RESEARCH_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i === stepIdx ? "bg-[rgb(var(--accent-rgb))]" : "bg-theme-border"}`}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && payload && (
        <div className="mt-5 space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-accent-soft px-2 py-0.5 rounded-full border border-theme-border">
                {payload.source === "openai" ? "Web + OpenAI" : payload.source === "gemini" ? "Gemini" : "Offline brief"}
              </span>
            </div>
            <h3 className="text-base font-semibold text-theme-primary leading-snug">{payload.localProblem}</h3>
            <p className="text-theme-muted text-sm mt-2 leading-relaxed max-w-2xl">{payload.problemContext}</p>
          </div>

          {payload.newsSnippets && payload.newsSnippets.length > 0 && (
            <div className="rounded-xl border border-theme-border px-4 py-3 bg-[color-mix(in_oklab,var(--surface-1)_88%,transparent)]">
              <p className="text-[10px] font-mono uppercase tracking-widest text-accent-soft mb-2">Recent sources</p>
              <ul className="space-y-1.5">
                {payload.newsSnippets.map((n, i) => (
                  <li key={i}>
                    <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-soft hover:text-accent underline-offset-2 hover:underline break-all">
                      {n.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-theme-border px-4 py-3 bg-[color-mix(in_oklab,var(--surface-1)_88%,transparent)]">
              <p className="text-[10px] font-mono uppercase tracking-widest text-accent-soft mb-2">This month</p>
              <ul className="space-y-2 text-sm text-theme-muted">
                {payload.shortTerm.map((t, i) => (
                  <li key={i} className="flex gap-2 leading-snug">
                    <span className="text-accent shrink-0">·</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-theme-border px-4 py-3 bg-[color-mix(in_oklab,var(--surface-1)_88%,transparent)]">
              <p className="text-[10px] font-mono uppercase tracking-widest text-accent-soft mb-2">Longer term</p>
              <ul className="space-y-2 text-sm text-theme-muted">
                {payload.longTerm.map((t, i) => (
                  <li key={i} className="flex gap-2 leading-snug">
                    <span className="text-accent shrink-0">·</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-1 border-t border-theme-border">
            <div>
              <p className="text-theme-faint text-[10px] font-mono uppercase mb-2">Optional buys</p>
              <ul className="space-y-2">
                {payload.productIdeas.map((p, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-theme-primary font-medium">{p.name}</span>
                    <span className="text-theme-muted text-xs block mt-0.5">{p.why}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-theme-faint text-[10px] font-mono uppercase mb-2">Ways to give</p>
              <ul className="space-y-2">
                {payload.foundations.map((f, i) => (
                  <li key={i} className="text-sm">
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-accent-soft hover:text-accent font-medium">
                      {f.name} →
                    </a>
                    <span className="text-theme-muted text-xs block mt-0.5">{f.why}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-theme-faint text-[11px] leading-relaxed">{payload.disclaimer}</p>
        </div>
      )}

      {!loading && !payload && <p className="text-theme-muted text-sm mt-4">Could not load this brief. Refresh to retry.</p>}
    </motion.section>
  );
}
