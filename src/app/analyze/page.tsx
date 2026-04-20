"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import StarField from "@/components/StarField";
import SimulationPanel from "@/components/SimulationPanel";
import LocationSearch from "@/components/LocationSearch";
import ClimateFork, { defaultClimateFork, forkModifiers, type ClimateForkProfile } from "@/components/ClimateFork";
import PlaceResearchPanel from "@/components/PlaceResearchPanel";
import AnalyzeLocationMap from "@/components/AnalyzeLocationMap";
import Link from "next/link";
import Image from "next/image";

interface AnalysisResult {
  name: string;
  postal: string | null;
  lat: number;
  lon: number;
  score: number;
  aqi: { index: number; label: string; pm2_5: number; no2: number; o3: number; co: number; pm10: number };
  weather: { temp: number; humidity: number; wind: number; feelsLike: number; maxTemp: number; minTemp: number; uvIndex: number; precipNext3: number };
  metrics: { greenCover: number; concretePercent: number; nearestPark: number; treeCount: number; carbonPerCapita: number; population: number; buildingDensity: number; vehicleDensity: number };
  actions: Array<{ icon: string; title: string; impact: string; ripple: string; link: string; linkText: string; category: string }>;
  satImage: string;
  mapUrl: string;
  earthUrl: string;
  mapUrlOsm: string;
  analysedAt: string;
}

interface AIPlan {
  source: "gemini" | "fallback";
  summary: string;
  actions: string[];
  challenge: string;
}

const AQI_COLORS = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];
const SCORE_COLOR = (s: number) => s >= 70 ? "#22c55e" : s >= 45 ? "#eab308" : "#ef4444";

const STEPS = [
  "Locating your area...",
  "Pulling satellite imagery...",
  "Reading air quality sensors...",
  "Analysing urban geometry...",
  "Calculating your impact profile...",
  "Building recommendations...",
];

function ScoreRing({ score }: { score: number }) {
  const r = 52, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="absolute rotate-[-90deg]" width="128" height="128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <motion.circle
          cx="64" cy="64" r={r} fill="none"
          stroke={SCORE_COLOR(score)} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.6, ease: "easeOut", delay: 0.4 }}
        />
      </svg>
      <div className="text-center z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-3xl font-bold"
          style={{ color: SCORE_COLOR(score) }}
        >
          {score}
        </motion.div>
        <div className="text-theme-faint text-xs font-mono">/100</div>
      </div>
    </div>
  );
}

function Tile({ label, value, unit, color, mono }: { label: string; value: string | number; unit?: string; color?: string; mono?: boolean }) {
  return (
    <div className="glass rounded-2xl p-4 flex flex-col gap-1.5">
      <div className="text-white/30 text-xs uppercase tracking-wider font-mono">{label}</div>
      <div className={`text-xl font-bold ${mono ? "font-mono" : ""}`} style={{ color: color ?? "#fff" }}>
        {value}
        {unit && <span className="text-sm font-normal text-white/35 ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function BarMeter({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-white/40">{label}</span>
        <span className="font-mono" style={{ color }}>{value}</span>
      </div>
      <div className="h-1 bg-white/6 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.6 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

function ActionCard({ action, index }: { action: AnalysisResult["actions"][0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index + 0.9 }}
      className="glass rounded-2xl p-6 flex flex-col gap-4 hover:border-[rgba(var(--accent-rgb),0.18)] transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-accent-soft text-xs font-mono uppercase tracking-widest">{action.category}</span>
          <p className="text-white/90 text-sm font-medium mt-1 leading-snug">{action.title}</p>
        </div>
      </div>
      <div className="text-green-400/80 text-xs font-mono">{action.impact}</div>
      <div className="bg-[var(--glass-fill)] rounded-xl p-3 text-theme-muted text-xs leading-relaxed border-l-2 border-[rgba(var(--accent-rgb),0.22)]">
        {action.ripple}
      </div>
      <a
        href={action.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-theme-faint hover:text-accent transition-colors font-mono"
      >
        {action.linkText} &rarr;
      </a>
    </motion.div>
  );
}

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [aiPlan, setAiPlan] = useState<AIPlan | null>(null);
  const [fork, setFork] = useState<ClimateForkProfile>(defaultClimateFork);
  const [compare, setCompare] = useState<AnalysisResult | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 600);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");
    const name = searchParams.get("name");
    const postal = searchParams.get("postal");
    if (!lat || !lon) { router.push("/"); return; }
    const params = new URLSearchParams({ lat, lon, name: name ?? "" });
    if (postal) params.set("postal", postal);
    fetch(`/api/analyze?${params}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [searchParams, router]);

  useEffect(() => {
    if (!data) return;
    const ctrl = new AbortController();
    fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        cityName: data.name,
        score: data.score,
        aqiLabel: data.aqi.label,
        temp: data.weather.temp,
        greenCover: data.metrics.greenCover,
        carbonPerCapita: data.metrics.carbonPerCapita,
        population: data.metrics.population,
        fork: {
          commute: fork.commute,
          cooling: fork.cooling,
          diet: fork.diet,
          fabric: fork.fabric,
        },
      }),
    })
      .then((r) => r.json())
      .then((plan) => setAiPlan(plan))
      .catch(() => {});
    return () => ctrl.abort();
  }, [data, fork]);

  const loadCompare = (place: { name: string; lat: number; lon: number; postalCode?: string }) => {
    setCompareLoading(true);
    setCompareError(null);
    const params = new URLSearchParams({
      lat: place.lat.toString(),
      lon: place.lon.toString(),
      name: place.name,
    });
    if (place.postalCode) params.set("postal", place.postalCode);
    fetch(`/api/analyze?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.error) throw new Error(d.error);
        setCompare(d);
        setCompareLoading(false);
      })
      .catch(() => {
        setCompareError("Could not load compare pin.");
        setCompareLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen theme-bg flex flex-col items-center justify-center gap-8">
        <StarField />
        <div className="relative z-10 flex flex-col items-center gap-8">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 border border-[rgba(var(--accent-rgb),0.12)] rounded-full animate-ping" />
            <div className="absolute inset-2 border border-[rgba(var(--accent-rgb),0.22)] rounded-full animate-ping" style={{ animationDelay: "0.3s" }} />
            <div className="absolute inset-4 border border-[rgba(var(--accent-rgb),0.32)] rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[rgb(var(--accent-rgb))]" />
            </div>
          </div>
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-accent-soft text-xs font-mono tracking-widest"
          >
            {STEPS[step]}
          </motion.p>
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className={`w-1 h-1 rounded-full transition-all ${i <= step ? "bg-[rgb(var(--accent-rgb))]" : "bg-white/10"}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <Link href="/" className="text-accent font-mono text-sm">Return home</Link>
      </div>
    );
  }

  const shortName = data.name.split(",")[0];
  const analysedTime = new Date(data.analysedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const { carbonMult, aqiAdj } = forkModifiers(fork);
  const simBaseAqi = data.aqi.index * 20 + 10 + aqiAdj;
  const simBaseCarbon = data.metrics.carbonPerCapita * carbonMult;
  const compareShort = compare?.name.split(",")[0];

  return (
    <div className="min-h-screen theme-bg theme-fg">
      <StarField />
      <div className="relative z-10 max-w-5xl mx-auto px-5 py-10">

        {/* Nav */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-theme-faint hover:text-theme-muted text-xs font-mono transition-colors">
            &larr; earthpulse
          </Link>
          <span className="text-theme-faint text-xs font-mono text-right max-w-[14rem] sm:max-w-none">
            fork + duel · {analysedTime}
          </span>
        </div>

        {/* ── HERO CARD ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl overflow-hidden mb-6"
        >
          {/* Satellite image */}
          <div className="relative h-40 sm:h-44 md:h-52 w-full bg-white/3 overflow-hidden">
            <Image
              src={data.satImage}
              alt={`Satellite view of ${shortName}`}
              fill
              className="object-cover opacity-90"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
              <div>
                <p className="text-white/40 text-xs font-mono mb-0.5">SATELLITE VIEW</p>
                <h1 className="text-2xl md:text-3xl font-semibold text-white">{shortName}</h1>
                {data.postal && (
                  <p className="text-white/40 text-xs font-mono mt-0.5">{data.postal}</p>
                )}
              </div>
            </div>
          </div>

          <AnalyzeLocationMap
            lat={data.lat}
            lon={data.lon}
            placeLabel={shortName}
            mapUrl={data.mapUrl}
            earthUrl={data.earthUrl}
            mapUrlOsm={data.mapUrlOsm}
          />

          {/* Score + quick stats */}
          <div className="p-6 flex flex-col md:flex-row gap-6 items-center md:items-start">
            <div className="flex flex-col items-center gap-1.5">
              <ScoreRing score={data.score} />
              <p className="text-theme-faint text-xs font-mono text-center">Planet Health<br />Score</p>
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
              <Tile label="Air Quality" value={data.aqi.label} color={AQI_COLORS[data.aqi.index]} />
              <Tile label="Temperature" value={data.weather.temp} unit="°C" />
              <Tile label="Green Cover" value={data.metrics.greenCover} unit="%" color="#4ade80" />
              <Tile label="CO₂ / capita" value={data.metrics.carbonPerCapita} unit="t/yr" color="#fb923c" />
            </div>
          </div>
        </motion.div>

        <PlaceResearchPanel
          key={`${data.lat.toFixed(4)}-${data.lon.toFixed(4)}`}
          metrics={{
            name: data.name,
            lat: data.lat,
            lon: data.lon,
            score: data.score,
            aqiLabel: data.aqi.label,
            greenCover: data.metrics.greenCover,
            population: data.metrics.population,
            concretePercent: data.metrics.concretePercent,
          }}
        />

        <details className="group glass rounded-3xl border border-[rgba(var(--accent-rgb),0.12)] mb-6 overflow-hidden">
          <summary className="cursor-pointer select-none list-none flex items-center justify-between gap-3 px-5 py-4 hover:bg-[color-mix(in_oklab,var(--surface-1)_35%,transparent)] transition-colors [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-theme-faint text-[10px] font-mono tracking-[0.22em] uppercase mb-0.5">Go deeper</p>
              <span className="text-theme-primary text-sm font-semibold">Compare, charts, simulator</span>
            </div>
            <svg className="w-4 h-4 text-theme-faint shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div className="border-t border-theme-border px-5 pb-6 pt-2 space-y-6">
            {/* ── FORK + DUEL ── */}
            <div className="grid lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <ClimateFork value={fork} onChange={setFork} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="glass rounded-3xl p-7 flex flex-col gap-4"
              >
                <div>
                  <p className="text-theme-faint text-xs font-mono tracking-[0.28em] uppercase mb-2">Neighbourhood duel</p>
                  <h3 className="text-lg font-semibold text-theme-primary">Contrast your pin</h3>
                  <p className="text-theme-muted text-sm mt-1">
                    Pick a leafier suburb, your hometown, or a district you envy — same metrics, instant gap.
                  </p>
                </div>
                <LocationSearch
                  onSelect={loadCompare}
                  showPostalCode
                />
                {compareLoading && <p className="text-theme-faint text-xs font-mono">Pulling compare pin…</p>}
                {compareError && <p className="text-red-400/70 text-xs">{compareError}</p>}
                {compare && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-theme-border">
                    <div className="text-center" key="you-ring">
                      <p className="text-theme-faint text-[10px] font-mono uppercase mb-2">You · {shortName}</p>
                      <ScoreRing score={data.score} />
                    </div>
                    <div className="text-center" key="them-ring">
                      <p className="text-theme-faint text-[10px] font-mono uppercase mb-2">Them · {compareShort}</p>
                      <ScoreRing score={compare.score} />
                    </div>
                    <div className="col-span-2 text-center text-xs font-mono text-theme-muted">
                      Stress gap:{" "}
                      <span className={data.score - compare.score >= 0 ? "text-emerald-400/80" : "text-orange-400/80"}>
                        {data.score >= compare.score ? "+" : ""}
                        {(data.score - compare.score).toFixed(0)} pts
                      </span>
                      {" "}on your score vs theirs
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* ── DETAIL GRID ── */}
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl p-6"
              >
                <p className="text-theme-faint text-xs font-mono tracking-widest uppercase mb-5">Air Quality Breakdown</p>
                <div className="flex flex-col gap-4">
                  <BarMeter label="PM2.5 (fine particles)" value={Math.round(data.aqi.pm2_5)} max={75} color="#f97316" />
                  <BarMeter label="PM10 (coarse particles)" value={Math.round(data.aqi.pm10)} max={150} color="#eab308" />
                  <BarMeter label="NO₂ (nitrogen dioxide)" value={Math.round(data.aqi.no2)} max={200} color="#fb923c" />
                  <BarMeter label="O₃ (ozone)" value={Math.round(data.aqi.o3)} max={180} color="#a78bfa" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 }}
                className="glass rounded-2xl p-6"
              >
                <p className="text-theme-faint text-xs font-mono tracking-widest uppercase mb-5">Urban & Climate Profile</p>
                <div className="grid grid-cols-2 gap-3">
                  <Tile label="Humidity" value={data.weather.humidity} unit="%" mono />
                  <Tile label="Wind" value={data.weather.wind} unit="km/h" mono />
                  <Tile label="UV Index" value={data.weather.uvIndex} color={data.weather.uvIndex > 6 ? "#f97316" : "#4ade80"} mono />
                  <Tile label="Rain (3 days)" value={data.weather.precipNext3} unit="mm" mono />
                  <Tile label="Concrete %" value={data.metrics.concretePercent} unit="%" color="#94a3b8" mono />
                  <Tile label="Nearest Park" value={data.metrics.nearestPark} unit="km" mono />
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
            >
              <SimulationPanel
                cityPop={data.metrics.population}
                baseAqi={simBaseAqi}
                baseCarbon={simBaseCarbon}
                cityName={shortName}
                forkHint={`Fork shifts baseline CO₂ ×${carbonMult.toFixed(2)} and AQI anchor ${aqiAdj >= 0 ? "+" : ""}${aqiAdj} pts.`}
              />
            </motion.div>
          </div>
        </details>

        <details className="group glass rounded-3xl border border-[rgba(var(--accent-rgb),0.12)] mb-10 overflow-hidden">
          <summary className="cursor-pointer select-none list-none flex items-center justify-between gap-3 px-5 py-4 hover:bg-[color-mix(in_oklab,var(--surface-1)_35%,transparent)] transition-colors [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-theme-faint text-[10px] font-mono tracking-[0.22em] uppercase mb-0.5">Take action</p>
              <span className="text-theme-primary text-sm font-semibold">Impact list & 7-day AI plan</span>
            </div>
            <svg className="w-4 h-4 text-theme-faint shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div className="border-t border-theme-border px-5 pb-6 pt-4 space-y-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
              <div className="mb-6">
                <p className="text-theme-faint text-xs font-mono tracking-widest uppercase mb-1">Personalised for {shortName}</p>
                <h2 className="text-xl font-semibold text-theme-primary">Your highest-impact actions</h2>
                <p className="text-theme-muted text-sm mt-1">Ranked by what actually moves the needle where you live.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {data.actions.map((a, i) => <ActionCard key={i} action={a} index={i} />)}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass rounded-2xl p-6"
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-theme-faint text-xs font-mono tracking-widest uppercase mb-1">AI Climate Copilot</p>
                  <h3 className="text-theme-primary text-lg font-semibold">7-day action plan for {shortName}</h3>
                </div>
                {aiPlan?.source && (
                  <span className="text-xs font-mono px-2.5 py-1 rounded-full border border-theme-border text-accent-soft">
                    {aiPlan.source === "gemini" ? "Gemini" : "Fallback"}
                  </span>
                )}
              </div>

              {!aiPlan && (
                <p className="text-theme-muted text-sm">Generating localized plan...</p>
              )}

              {aiPlan && (
                <div className="space-y-4">
                  <p className="text-theme-muted text-sm leading-relaxed">{aiPlan.summary}</p>
                  <div className="grid md:grid-cols-3 gap-3">
                    {aiPlan.actions.slice(0, 3).map((action, i) => (
                      <div key={i} className="bg-white/4 rounded-xl p-4 text-sm text-theme-muted">
                        <span className="text-accent-soft text-xs font-mono block mb-2">ACTION {i + 1}</span>
                        {action}
                      </div>
                    ))}
                  </div>
                  <p className="text-theme-muted text-xs border-l-2 border-[rgba(var(--accent-rgb),0.22)] pl-3">
                    Community challenge: {aiPlan.challenge}
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </details>

        {/* ── SHARE ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="glass rounded-2xl p-6 text-center"
        >
          <p className="text-theme-muted text-sm mb-4">
            The numbers only compound when more people see them.
          </p>
          <button
            onClick={() => navigator.share?.({ title: `${shortName} — EarthPulse`, url: window.location.href })}
            className="px-7 py-3 rounded-full border border-[rgba(var(--accent-rgb),0.28)] text-accent-soft text-sm font-mono hover:bg-accent-muted hover:border-[rgba(var(--accent-rgb),0.45)] transition-all"
          >
            Share this report
          </button>
        </motion.div>

      </div>
    </div>
  );
}

export default function AnalyzePage() {
  return <Suspense><AnalyzeContent /></Suspense>;
}
