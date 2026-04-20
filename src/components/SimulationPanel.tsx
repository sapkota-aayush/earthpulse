"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface Props {
  cityPop: number;
  baseAqi: number;
  baseCarbon: number;
  cityName: string;
  forkHint?: string;
}

export default function SimulationPanel({ cityPop, baseAqi, baseCarbon, cityName, forkHint }: Props) {
  const [ev, setEv] = useState(0);
  const [green, setGreen] = useState(0);
  const [renewable, setRenewable] = useState(0);

  const co2Saved = ((ev / 100) * 2.1 + (green / 100) * 0.8 + (renewable / 100) * 3.2) * cityPop;
  const aqiImprove = Math.min(40, (ev / 100) * 18 + (green / 100) * 8 + (renewable / 100) * 12);
  const tempDrop = ((green / 100) * 0.8 + (renewable / 100) * 0.3 + (ev / 100) * 0.2).toFixed(2);
  const treesEquiv = Math.round(co2Saved / 22);
  const newAqi = Math.max(1, baseAqi - aqiImprove);

  const active = ev > 0 || green > 0 || renewable > 0;

  return (
    <div className="glass rounded-3xl p-7">
      <div className="mb-6">
        <p className="text-white/30 text-xs tracking-widest uppercase font-mono mb-1">Impact Simulator</p>
        <h3 className="text-lg font-semibold text-white">
          What if {cityName} changed?
        </h3>
        <p className="text-white/40 text-sm mt-1">
          Drag the sliders. Watch what happens to your city in real time.
          <span className="block text-white/25 text-xs mt-1">Baseline footprint: {baseCarbon.toFixed(1)} tCO2/person/year</span>
          {forkHint && <span className="block text-sky-400/35 text-[11px] font-mono mt-1">{forkHint}</span>}
        </p>
      </div>

      <div className="flex flex-col gap-6 mb-8">
        <Slider
          label="EV & public transit adoption"
          value={ev}
          onChange={setEv}
          color="#38bdf8"
          description="% of residents switching from petrol vehicles"
        />
        <Slider
          label="Urban green cover increase"
          value={green}
          onChange={setGreen}
          color="#4ade80"
          description="% increase in parks, trees, and green roofs"
        />
        <Slider
          label="Renewable energy switch"
          value={renewable}
          onChange={setRenewable}
          color="#a78bfa"
          description="% of households moving to solar / wind"
        />
      </div>

      {active ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <ResultTile label="CO₂ saved / yr" value={formatCO2(co2Saved)} color="#38bdf8" />
          <ResultTile label="AQI improvement" value={`-${aqiImprove.toFixed(0)} pts`} color="#4ade80" />
          <ResultTile label="Temp drop" value={`-${tempDrop}°C`} color="#a78bfa" />
          <ResultTile label="Trees equivalent" value={formatNum(treesEquiv)} color="#fb923c" />
        </motion.div>
      ) : (
        <div className="text-center text-white/20 text-sm py-4">
          Move a slider to see the impact
        </div>
      )}

      {active && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-5 text-center text-white/40 text-xs"
        >
          New projected AQI: <span className="text-white/70">{newAqi.toFixed(0)}</span> · Based on population of{" "}
          <span className="text-white/70">{(cityPop / 1e6).toFixed(1)}M</span>
        </motion.p>
      )}
    </div>
  );
}

function Slider({ label, value, onChange, color, description }: {
  label: string; value: number; onChange: (v: number) => void; color: string; description: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-white/80 text-sm font-medium">{label}</span>
        <span className="font-mono text-sm" style={{ color }}>{value}%</span>
      </div>
      <p className="text-white/30 text-xs mb-2">{description}</p>
      <div className="relative">
        <input
          type="range" min={0} max={100} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 appearance-none rounded-full outline-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color} ${value}%, rgba(255,255,255,0.08) ${value}%)`,
          }}
        />
      </div>
    </div>
  );
}

function ResultTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/4 rounded-2xl p-4 text-center">
      <div className="text-xs text-white/30 mb-1">{label}</div>
      <div className="font-bold text-lg" style={{ color }}>{value}</div>
    </div>
  );
}

function formatCO2(tons: number) {
  if (tons >= 1e9) return `${(tons / 1e9).toFixed(1)}Gt`;
  if (tons >= 1e6) return `${(tons / 1e6).toFixed(1)}Mt`;
  if (tons >= 1e3) return `${(tons / 1e3).toFixed(0)}kt`;
  return `${tons.toFixed(0)}t`;
}

function formatNum(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return `${n}`;
}
