"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme, type AccentId } from "@/theme/ThemeContext";

const ACCENT_RGB: Record<AccentId, string> = {
  sky: "56,189,248",
  emerald: "52,211,153",
  violet: "167,139,250",
  amber: "251,191,36",
  rose: "251,113,133",
};

interface Props {
  visible: boolean;
  lat: number;
  lon: number;
  locationName: string;
  satImage: string | null;
}

export const PHASES = [
  { label: "ACQUIRING ORBITAL SLOT",    duration: 900  },
  { label: "LOCKING COORDINATES",       duration: 800  },
  { label: "UPLINK HANDSHAKE",          duration: 700  },
  { label: "DOWNLINKING TILE BATCH 1",  duration: 900  },
  { label: "DOWNLINKING TILE BATCH 2",  duration: 800  },
  { label: "PULLING AIR QUALITY GRID",  duration: 700  },
  { label: "FUSING SENSOR LAYERS",      duration: 700  },
  { label: "ANALYSIS COMPLETE",         duration: 600  },
] as const;

export const SCAN_OVERLAY_SEQUENCE_MS = PHASES.reduce((s, p) => s + p.duration, 0);

const COLS = 7, ROWS = 4;
const TILE_COUNT = COLS * ROWS;

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function useCounter(target: number, durationMs: number, active: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    let v = 0;
    const step = target / (durationMs / 16);
    const id = setInterval(() => {
      v += step;
      if (v >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.round(v));
    }, 16);
    return () => clearInterval(id);
  }, [target, durationMs, active]);
  return val;
}

// ── Radar component ────────────────────────────────────────────
function Radar({ rgb }: { rgb: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const S = canvas.width;
    const cx = S / 2, cy = S / 2, r = S / 2 - 4;

    const blips = Array.from({ length: 4 }, () => ({
      a: Math.random() * Math.PI * 2,
      d: 0.3 + Math.random() * 0.6,
      brightness: 0,
    }));

    let frame: number;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, S, S);

      // Background circles
      ctx.strokeStyle = `rgba(${rgb},0.12)`;
      ctx.lineWidth = 1;
      [0.33, 0.66, 1].forEach((f) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r * f, 0, Math.PI * 2);
        ctx.stroke();
      });
      // Cross hairs
      ctx.beginPath();
      ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
      ctx.strokeStyle = `rgba(${rgb},0.1)`;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleRef.current);
      const grad = ctx.createLinearGradient(0, 0, r, 0);
      grad.addColorStop(0, `rgba(${rgb},0.55)`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, -0.55, 0);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      // Sweep leading edge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r, 0);
      ctx.strokeStyle = `rgba(${rgb},0.7)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // Blips
      blips.forEach((b) => {
        const diff = ((angleRef.current - b.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (diff < 0.15) b.brightness = 1;
        else b.brightness *= 0.97;
        if (b.brightness < 0.02) return;
        const bx = cx + Math.cos(b.a) * r * b.d;
        const by = cy + Math.sin(b.a) * r * b.d;
        ctx.beginPath();
        ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${b.brightness.toFixed(2)})`;
        ctx.fill();
        // Halo
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${(b.brightness * 0.2).toFixed(2)})`;
        ctx.fill();
      });

      angleRef.current = (angleRef.current + 0.025) % (Math.PI * 2);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [rgb]);

  return <canvas ref={canvasRef} width={120} height={120} className="opacity-80" />;
}

// ── Scrolling telemetry ────────────────────────────────────────
function TelemetryStream({ rgb, lat, lon }: { rgb: string; lat: number; lon: number }) {
  const [lines, setLines] = useState<string[]>([]);

  const makeLines = useCallback(() => [
    `>_ uplink ${(400 + Math.random() * 200).toFixed(1)} MHz`,
    `>_ snr ${(18 + Math.random() * 10).toFixed(1)} dB`,
    `>_ lat ${lat.toFixed(6)}`,
    `>_ lon ${lon.toFixed(6)}`,
    `>_ alt 482.${Math.floor(Math.random() * 9)} km`,
    `>_ tiles ${TILE_COUNT}/${TILE_COUNT} OK`,
    `>_ pm2.5 ${(10 + Math.random() * 20).toFixed(1)} µg`,
    `>_ no2  ${(8 + Math.random() * 15).toFixed(1)} ppb`,
    `>_ temp ${(18 + Math.random() * 18).toFixed(1)} °C`,
    `>_ pkt loss 0.0%`,
    `>_ checksum PASS`,
    `>_ crc32 ${Math.floor(Math.random() * 0xFFFFFFFF).toString(16).padStart(8, "0")}`,
    `>_ rgb composite OK`,
    `>_ band ratio OK`,
    `>_ demosaic OK`,
    `>_ wkt POINT(${lon.toFixed(4)} ${lat.toFixed(4)})`,
  ], [lat, lon]);

  useEffect(() => {
    setLines(makeLines());
    const id = setInterval(() => {
      setLines((prev) => {
        const next = [...prev.slice(1), makeLines()[Math.floor(Math.random() * 16)]];
        return next;
      });
    }, 380);
    return () => clearInterval(id);
  }, [makeLines]);

  return (
    <div className="font-mono text-[9px] leading-relaxed space-y-0.5 overflow-hidden h-full"
      style={{ color: `rgba(${rgb},0.45)` }}>
      {lines.map((l, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}>
          {l}
        </motion.div>
      ))}
    </div>
  );
}

// ── Signal bars ────────────────────────────────────────────────
function SignalBars({ rgb, phase }: { rgb: string; phase: number }) {
  const strength = Math.min(1, (phase + 1) / PHASES.length);
  return (
    <div className="flex items-end gap-1 h-8">
      {Array.from({ length: 8 }, (_, i) => {
        const active = i / 8 < strength;
        const h = 20 + i * 6;
        return (
          <motion.div key={i}
            animate={{ opacity: active ? 1 : 0.12, background: active ? `rgb(${rgb})` : "rgba(255,255,255,0.1)" }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            style={{ height: h, width: 5, borderRadius: 2 }}
          />
        );
      })}
    </div>
  );
}

// ── Main overlay ───────────────────────────────────────────────
export default function ScanOverlay({ visible, lat, lon, locationName, satImage }: Props) {
  const { accent } = useTheme();
  const rgb = ACCENT_RGB[accent];

  const [phase, setPhase] = useState(0);
  const [tileOrder, setTileOrder] = useState<number[]>([]);
  const [revealedTiles, setRevealedTiles] = useState<Set<number>>(new Set());
  const [imageLoaded, setImageLoaded] = useState(false);
  const [scanY, setScanY] = useState(0);
  const [layer, setLayer] = useState<"LOADING" | "RGB" | "THERMAL" | "COMPOSITE">("LOADING");

  const latDisp = useCounter(Math.abs(lat * 10000), 3500, visible);
  const lonDisp = useCounter(Math.abs(lon * 10000), 3500, visible);

  useEffect(() => {
    if (!visible) {
      setPhase(0); setRevealedTiles(new Set()); setImageLoaded(false);
      setScanY(0); setLayer("LOADING"); setTileOrder([]);
      return;
    }

    // Reset
    const order = shuffled(Array.from({ length: TILE_COUNT }, (_, i) => i));
    setTileOrder(order);
    setRevealedTiles(new Set());
    setLayer("LOADING");

    // Phase progression
    const ids: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    PHASES.forEach((p, i) => {
      ids.push(setTimeout(() => setPhase(i), elapsed));
      elapsed += p.duration;
    });

    // Start tile reveal at ~1.8s — one tile every 90ms
    const TILE_START = 1800;
    order.forEach((tileIdx, i) => {
      ids.push(setTimeout(() => {
        setRevealedTiles((prev) => {
          const next = new Set(prev);
          next.add(tileIdx);
          if (next.size === TILE_COUNT) setImageLoaded(true);
          return next;
        });
      }, TILE_START + i * 85));
    });

    // Layer labels after image fully loads (~1.8 + 28*85 = ~4.2s)
    const FULL_REVEAL = TILE_START + TILE_COUNT * 85;
    ids.push(setTimeout(() => setLayer("RGB"), FULL_REVEAL));
    ids.push(setTimeout(() => setLayer("THERMAL"), FULL_REVEAL + 800));
    ids.push(setTimeout(() => setLayer("COMPOSITE"), FULL_REVEAL + 1600));

    // Scan line
    let y = 0;
    const scanId = setInterval(() => {
      y = (y + 0.35) % 100;
      setScanY(y);
    }, 20);

    return () => {
      ids.forEach((id) => clearTimeout(id));
      clearInterval(scanId);
    };
  }, [visible]);

  const shortName = locationName.split(",")[0];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center overflow-hidden"
        >
          {/* CRT scanlines */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.8), rgba(255,255,255,0.8) 1px, transparent 1px, transparent 3px)" }} />

          {/* Corner brackets */}
          {(["top-6 left-6 border-t border-l", "top-6 right-6 border-t border-r",
             "bottom-6 left-6 border-b border-l", "bottom-6 right-6 border-b border-r"] as const
          ).map((cls, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, scale: 1.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.06 * i, duration: 0.4, ease: "easeOut" }}
              className={`absolute w-10 h-10 pointer-events-none ${cls}`}
              style={{ borderColor: `rgba(${rgb},0.5)` }}
            />
          ))}

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-8 border-b pointer-events-none"
            style={{ borderColor: `rgba(${rgb},0.1)` }}>
            <span className="font-mono text-[10px] tracking-[0.3em]" style={{ color: `rgba(${rgb},0.45)` }}>
              EARTHPULSE · GROUND SEGMENT
            </span>
            <AnimatePresence mode="wait">
              <motion.span key={phase}
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="font-mono text-[10px] tracking-[0.28em]"
                style={{ color: `rgb(${rgb})` }}>
                {PHASES[phase]?.label}
              </motion.span>
            </AnimatePresence>
            <div className="flex items-center gap-2">
              <SignalBars rgb={rgb} phase={phase} />
            </div>
          </div>

          {/* Main content */}
          <div className="flex items-center gap-5 mt-8 w-full max-w-5xl px-5">

            {/* Left panel — radar */}
            <div className="hidden lg:flex flex-col gap-5 shrink-0 w-36">
              <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}>
                <p className="font-mono text-[9px] mb-2 tracking-widest" style={{ color: `rgba(${rgb},0.4)` }}>ORBITAL RADAR</p>
                <Radar rgb={rgb} />
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                className="flex flex-col gap-1 font-mono text-[9px] leading-relaxed"
                style={{ color: `rgba(${rgb},0.35)` }}>
                <p className="tracking-widest mb-1" style={{ color: `rgba(${rgb},0.5)` }}>ORBIT DATA</p>
                <span>INC  {(51.2 + (Math.abs(lat) % 4.2)).toFixed(2)}°</span>
                <span>ALT  {Math.round(410 + (Math.abs(lon * 13.7) % 95))} km</span>
                <span>PER  94.2 min</span>
                <span>RAAN {(lon + 180).toFixed(1)}°</span>
              </motion.div>
              {/* Phase progress */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="flex flex-col gap-1.5">
                {PHASES.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <motion.div
                      animate={{ background: i < phase ? `rgb(${rgb})` : i === phase ? `rgba(${rgb},0.7)` : "rgba(255,255,255,0.08)" }}
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                    />
                    <span className="font-mono text-[8px] truncate"
                      style={{ color: i <= phase ? `rgba(${rgb},0.55)` : "rgba(255,255,255,0.1)" }}>
                      {p.label}
                    </span>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Center — satellite image with tile reveal */}
            <div className="flex-1 flex flex-col gap-3">
              {/* Layer label */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  {(["RGB", "THERMAL", "COMPOSITE"] as const).map((l) => (
                    <motion.span key={l}
                      animate={{ color: layer === l ? `rgb(${rgb})` : "rgba(255,255,255,0.18)" }}
                      className="font-mono text-[9px] tracking-widest cursor-default">
                      {l}
                    </motion.span>
                  ))}
                </div>
                <span className="font-mono text-[9px]" style={{ color: `rgba(${rgb},0.4)` }}>
                  {revealedTiles.size}/{TILE_COUNT} tiles
                </span>
              </div>

              {/* Image container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="relative w-full aspect-video rounded-xl overflow-hidden"
                style={{ border: `1px solid rgba(${rgb},0.3)`, boxShadow: `0 0 40px rgba(${rgb},0.08), 0 0 80px rgba(0,0,0,0.6)` }}
              >
                {/* Base image */}
                {satImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={satImage} alt="satellite" className="absolute inset-0 w-full h-full object-cover" />
                )}

                {/* Tile mask — covers image until each tile is revealed */}
                <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)` }}>
                  {Array.from({ length: TILE_COUNT }, (_, i) => (
                    <motion.div key={i}
                      animate={{ opacity: revealedTiles.has(i) ? 0 : 1 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      style={{ background: `rgba(5,10,18,0.97)`, borderRight: `1px solid rgba(${rgb},0.04)`, borderBottom: `1px solid rgba(${rgb},0.04)` }}
                    />
                  ))}
                </div>

                {/* Scan line (only after image is loaded) */}
                {imageLoaded && (
                  <div className="absolute left-0 right-0 pointer-events-none z-10"
                    style={{
                      top: `${scanY}%`, height: 2,
                      background: `linear-gradient(to right, transparent, rgba(${rgb},0.7) 30%, rgba(${rgb},1) 50%, rgba(${rgb},0.7) 70%, transparent)`,
                      boxShadow: `0 0 16px rgba(${rgb},0.6), 0 0 40px rgba(${rgb},0.25)`,
                    }}
                  />
                )}

                {/* Grid overlay */}
                {imageLoaded && (
                  <div className="absolute inset-0 pointer-events-none z-[2] opacity-15"
                    style={{
                      backgroundImage: `linear-gradient(rgba(${rgb},0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(${rgb},0.4) 1px, transparent 1px)`,
                      backgroundSize: "32px 32px",
                    }}
                  />
                )}

                {/* Crosshair */}
                {imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[3]">
                    <div className="relative w-14 h-14">
                      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-full"
                        style={{ border: `1px solid rgba(${rgb},0.5)` }} />
                      <div className="absolute inset-[5px] rounded-full"
                        style={{ border: `1px solid rgba(${rgb},0.7)` }} />
                      <div className="absolute top-1/2 left-0 right-0 h-px" style={{ background: `rgba(${rgb},0.6)` }} />
                      <div className="absolute left-1/2 top-0 bottom-0 w-px" style={{ background: `rgba(${rgb},0.6)` }} />
                      {/* Corner ticks */}
                      {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sy],i) => (
                        <div key={i} className="absolute w-2 h-2"
                          style={{
                            top: sy === -1 ? -8 : "auto", bottom: sy === 1 ? -8 : "auto",
                            left: sx === -1 ? -8 : "auto", right: sx === 1 ? -8 : "auto",
                            borderTop: sy === -1 ? `1px solid rgba(${rgb},0.6)` : "none",
                            borderBottom: sy === 1 ? `1px solid rgba(${rgb},0.6)` : "none",
                            borderLeft: sx === -1 ? `1px solid rgba(${rgb},0.6)` : "none",
                            borderRight: sx === 1 ? `1px solid rgba(${rgb},0.6)` : "none",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Coordinate overlays */}
                {imageLoaded && (
                  <>
                    <div className="absolute top-3 left-3 font-mono text-[10px] space-y-0.5 z-[4]"
                      style={{ color: `rgba(${rgb},0.8)` }}>
                      <div>{lat >= 0 ? "N" : "S"} {(latDisp / 10000).toFixed(4)}°</div>
                      <div>{lon >= 0 ? "E" : "W"} {(lonDisp / 10000).toFixed(4)}°</div>
                    </div>
                    <div className="absolute top-3 right-3 font-mono text-[10px] text-right space-y-0.5 z-[4]"
                      style={{ color: `rgba(${rgb},0.7)` }}>
                      <div>ALT {Math.round(395 + (Math.abs(lat * 17.1) % 110))}km</div>
                      <motion.div animate={{ color: [`rgba(${rgb},0.5)`, `rgba(${rgb},1)`, `rgba(${rgb},0.5)`] }}
                        transition={{ duration: 1.5, repeat: Infinity }}>
                        LIVE
                      </motion.div>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 flex justify-between font-mono text-[9px] z-[4]"
                      style={{ color: `rgba(${rgb},0.5)` }}>
                      <span>ESRI WORLD IMAGERY</span>
                      <span>{new Date().toISOString().split("T")[0]}</span>
                    </div>
                  </>
                )}

                {/* Loading state */}
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center z-[5]">
                    <div className="text-center">
                      <motion.div animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
                        className="font-mono text-[10px] tracking-widest mb-2"
                        style={{ color: `rgba(${rgb},0.6)` }}>
                        DOWNLINKING
                      </motion.div>
                      <div className="font-mono text-[9px]" style={{ color: `rgba(${rgb},0.3)` }}>
                        {revealedTiles.size}/{TILE_COUNT}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Location label */}
              <div className="flex items-center justify-between px-1">
                <div>
                  <p className="text-white/80 font-light text-lg tracking-wide">{shortName}</p>
                  <p className="font-mono text-[10px] mt-0.5" style={{ color: `rgba(${rgb},0.4)` }}>
                    {locationName.split(",").slice(1, 3).join(",").trim()}
                  </p>
                </div>
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
                  className="font-mono text-[9px] tracking-widest"
                  style={{ color: `rgba(${rgb},0.6)` }}>
                  {phase < PHASES.length - 1 ? "PROCESSING..." : "READY"}
                </motion.div>
              </div>
            </div>

            {/* Right panel — telemetry */}
            <div className="hidden lg:flex flex-col gap-4 shrink-0 w-36">
              <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}>
                <p className="font-mono text-[9px] mb-2 tracking-widest" style={{ color: `rgba(${rgb},0.4)` }}>TELEMETRY</p>
                <div className="h-52 overflow-hidden">
                  <TelemetryStream rgb={rgb} lat={lat} lon={lon} />
                </div>
              </motion.div>
              {/* Waveform */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                <p className="font-mono text-[9px] mb-2 tracking-widest" style={{ color: `rgba(${rgb},0.4)` }}>RF SIGNAL</p>
                <SignalWave rgb={rgb} />
              </motion.div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 h-10 flex items-center justify-center gap-8 border-t pointer-events-none"
            style={{ borderColor: `rgba(${rgb},0.08)` }}>
            {["OPEN METEO", "NOMINATIM", "ESRI IMAGERY", "SENSORS ONLINE"].map((s, i) => (
              <span key={i} className="font-mono text-[9px] tracking-widest" style={{ color: `rgba(${rgb},0.25)` }}>{s}</span>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── RF waveform ────────────────────────────────────────────────
function SignalWave({ rgb }: { rgb: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    let frame: number;
    const draw = () => {
      frame = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const f = x / W;
        const y = H / 2 + Math.sin(f * 18 + tRef.current) * (H * 0.28) * Math.sin(f * Math.PI)
          + Math.sin(f * 31 + tRef.current * 1.3) * (H * 0.1);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${rgb},0.55)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      tRef.current += 0.06;
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [rgb]);
  return <canvas ref={canvasRef} width={136} height={48} className="opacity-80 rounded" />;
}
