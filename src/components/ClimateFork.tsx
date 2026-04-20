"use client";

import { motion } from "framer-motion";

export type CommuteMode = "car" | "mixed" | "lowcarbon";
export type CoolingMode = "ac_heavy" | "balanced" | "trees_first";
export type DietMode = "high_meat" | "flex" | "plant_forward";
export type BlockFabric = "heat_sink" | "average" | "leafy";

export type ClimateForkProfile = {
  commute: CommuteMode;
  cooling: CoolingMode;
  diet: DietMode;
  fabric: BlockFabric;
};

const DEFAULT: ClimateForkProfile = {
  commute: "mixed",
  cooling: "balanced",
  diet: "flex",
  fabric: "average",
};

const ROWS: {
  key: keyof ClimateForkProfile;
  label: string;
  hint: string;
  options: { id: CommuteMode | CoolingMode | DietMode | BlockFabric; title: string; sub: string }[];
}[] = [
  {
    key: "commute",
    label: "How do you actually move?",
    hint: "This shifts your personal emissions baseline in the simulator.",
    options: [
      { id: "car", title: "Mostly car", sub: "Solo trips dominate" },
      { id: "mixed", title: "Mixed", sub: "Car + transit + some walk" },
      { id: "lowcarbon", title: "Low-carbon", sub: "Transit / bike / walk first" },
    ],
  },
  {
    key: "cooling",
    label: "How does your home fight heat?",
    hint: "Urban heat + AC load changes what wins locally.",
    options: [
      { id: "ac_heavy", title: "AC-heavy", sub: "Cooling runs hard all season" },
      { id: "balanced", title: "Balanced", sub: "Some passive cooling habits" },
      { id: "trees_first", title: "Trees / shade first", sub: "Greenery + passive cooling" },
    ],
  },
  {
    key: "diet",
    label: "Weekly food pattern",
    hint: "Diet is a high-leverage lever when air quality is stressed.",
    options: [
      { id: "high_meat", title: "High meat", sub: "Beef/lamb often" },
      { id: "flex", title: "Flexitarian", sub: "Mostly mixed" },
      { id: "plant_forward", title: "Plant-forward", sub: "Plants default" },
    ],
  },
  {
    key: "fabric",
    label: "Your block fabric",
    hint: "Concrete vs canopy changes heat island stress and AQI exposure.",
    options: [
      { id: "heat_sink", title: "Heat sink", sub: "Dense concrete / asphalt" },
      { id: "average", title: "Average", sub: "Typical mixed block" },
      { id: "leafy", title: "Leafy", sub: "Trees / parks nearby" },
    ],
  },
];

export function forkModifiers(profile: ClimateForkProfile) {
  let carbonMult = 1;
  let aqiAdj = 0;

  if (profile.commute === "car") carbonMult += 0.14;
  if (profile.commute === "lowcarbon") carbonMult -= 0.11;

  if (profile.cooling === "ac_heavy") carbonMult += 0.09;
  if (profile.cooling === "trees_first") {
    carbonMult -= 0.06;
    aqiAdj -= 2;
  }

  if (profile.diet === "high_meat") carbonMult += 0.07;
  if (profile.diet === "plant_forward") carbonMult -= 0.06;

  if (profile.fabric === "heat_sink") aqiAdj += 4;
  if (profile.fabric === "leafy") aqiAdj -= 3;

  return { carbonMult, aqiAdj };
}

interface Props {
  value: ClimateForkProfile;
  onChange: (next: ClimateForkProfile) => void;
}

export const defaultClimateFork = DEFAULT;

export default function ClimateFork({ value, onChange }: Props) {
  return (
    <div className="glass rounded-3xl p-7">
      <div className="mb-6">
        <p className="text-theme-faint text-xs font-mono tracking-[0.28em] uppercase mb-2">Neighbourhood stress fork</p>
        <h3 className="text-lg font-semibold text-theme-primary">Tell us how your block actually runs</h3>
        <p className="text-theme-muted text-sm mt-1">
          Generic dashboards assume everyone is average. Fork your profile so the simulator and weekly plan match your reality.
        </p>
      </div>
      <div className="flex flex-col gap-7">
        {ROWS.map((row) => (
          <div key={row.key}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 mb-3">
              <div>
                <p className="text-theme-primary/88 text-sm font-medium">{row.label}</p>
                <p className="text-theme-muted text-xs">{row.hint}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              {row.options.map((opt) => {
                const active = value[row.key] === opt.id;
                return (
                  <motion.button
                    key={String(opt.id)}
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onChange({ ...value, [row.key]: opt.id as ClimateForkProfile[typeof row.key] })}
                    className={`text-left rounded-2xl border px-4 py-3 transition-all ${
                      active
                        ? "border-[rgba(var(--accent-rgb),0.45)] bg-accent-muted"
                        : "border-theme-border bg-[var(--glass-fill)] hover:border-[rgba(var(--accent-rgb),0.18)]"
                    }`}
                  >
                    <p className={`text-sm font-medium ${active ? "text-accent" : "text-theme-primary/88"}`}>{opt.title}</p>
                    <p className="text-theme-muted text-xs mt-1 leading-snug">{opt.sub}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
