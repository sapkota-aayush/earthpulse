"use client";

import { useEffect, useState } from "react";

const BASE = { co2: 424.7, temp: 1.48, ice: 14.1, species: 1000000 };

export default function PlanetStats() {
  const [co2, setCo2] = useState(BASE.co2);

  useEffect(() => {
    const id = setInterval(() => {
      setCo2((v) => parseFloat((v + 0.001).toFixed(3)));
    }, 800);
    return () => clearInterval(id);
  }, []);

  const stats = [
    { label: "Atmospheric CO₂", value: co2.toFixed(3), unit: "ppm", warn: true },
    { label: "Temp. anomaly", value: "+1.48", unit: "°C above 1850 avg", warn: true },
    { label: "Arctic sea ice loss", value: "13%", unit: "per decade", warn: true },
    { label: "Species at risk", value: "1M+", unit: "facing extinction", warn: true },
    { label: "Ocean acidity rise", value: "26%", unit: "since industrial era", warn: false },
    { label: "Annual tree loss", value: "15B", unit: "trees/year", warn: true },
  ];

  return (
    <div className="w-full px-4 sm:px-6 py-8">
      <div
        className="glass max-w-6xl mx-auto rounded-2xl border border-[rgba(var(--accent-rgb),0.12)] overflow-hidden ep-planet-ribbon"
        style={{ boxShadow: "var(--ribbon-shadow)" }}
      >
        <div className="border-b border-theme-border/80 px-4 py-2 flex items-center justify-between gap-3 bg-[color-mix(in_oklab,var(--surface-1)_88%,transparent)]">
          <span className="text-[10px] font-mono tracking-[0.35em] uppercase text-theme-muted">Live planet signals</span>
          <span className="text-[10px] font-mono text-theme-faint hidden sm:inline">Hover to pause</span>
        </div>
        <div className="py-5 overflow-hidden">
          <div className="ep-marquee flex gap-14 whitespace-nowrap pl-4 w-max">
            {[...stats, ...stats].map((s, i) => (
              <div key={i} className="flex items-baseline gap-3 shrink-0">
                <span className={`text-[11px] font-mono tracking-wide ${s.warn ? "stat-warm" : "stat-cool"}`}>
                  {s.label}
                </span>
                <span className="text-theme-primary font-semibold text-base tabular-nums tracking-tight">
                  {s.label === "Atmospheric CO₂" ? co2.toFixed(3) : s.value}
                </span>
                <span className="text-theme-muted text-[11px] max-w-[10rem] leading-snug">{s.unit}</span>
                <span className="w-px h-5 bg-[var(--border-strong)] opacity-60 mx-1 self-center" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
