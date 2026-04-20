"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BeforeAfterSlider from "./BeforeAfterSlider";
import type { DeadZone } from "@/lib/deadZones";

interface Props {
  zone: DeadZone | null;
  onClose: () => void;
  story: string | null;
  storyLoading: boolean;
}

// ── colour palette ─────────────────────────────────────────────────────────
const CATEGORY_COLOR: Record<DeadZone["category"], string> = {
  nuclear:      "#ef4444",
  industrial:   "#f97316",
  deforestation:"#22c55e",
  climate:      "#3b82f6",
  pollution:    "#eab308",
  war:          "#a855f7",
  extraction:   "#d97706",
};

const CATEGORY_LABEL: Record<DeadZone["category"], string> = {
  nuclear:      "NUCLEAR",
  industrial:   "INDUSTRIAL",
  deforestation:"DEFORESTATION",
  climate:      "CLIMATE",
  pollution:    "POLLUTION",
  war:          "WAR",
  extraction:   "EXTRACTION",
};

// ── severity ───────────────────────────────────────────────────────────────
function SeverityBadge({ level }: { level: 1 | 2 | 3 }) {
  const labels: Record<1 | 2 | 3, string> = {
    1: "MODERATE",
    2: "SEVERE",
    3: "CATASTROPHIC",
  };
  const colors: Record<1 | 2 | 3, string> = {
    1: "#eab308",
    2: "#f97316",
    3: "#ef4444",
  };
  const c = colors[level];
  return (
    <span
      className="inline-flex items-center gap-2 font-mono font-bold text-[12px]"
      style={{ color: c, whiteSpace: "nowrap", flexWrap: "nowrap", lineHeight: 1 }}
    >
      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5" style={{
        background: `${c}14`,
        border: `1px solid ${c}55`,
      }}>
        {([1, 2, 3] as const).map((i) => (
          <span
            key={i}
            className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
            style={{
              background: i <= level ? c : "transparent",
              border: `1.5px solid ${c}`,
              opacity: i <= level ? 1 : 0.35,
            }}
          />
        ))}
      </span>
      {labels[level]}
    </span>
  );
}

// ── skeleton loader ────────────────────────────────────────────────────────
function SkeletonLine({ width = "100%", height = "14px" }: { width?: string; height?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
      style={{
        width,
        height,
        borderRadius: "3px",
        background: "rgba(239,68,68,0.18)",
        marginBottom: "8px",
      }}
    />
  );
}

// ── stat cell ──────────────────────────────────────────────────────────────
function StatCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.14em",
          color: "rgba(255,255,255,0.35)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "monospace",
          fontSize: "12px",
          fontWeight: 600,
          color: "rgba(255,255,255,0.85)",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── main panel ─────────────────────────────────────────────────────────────
export default function DeadZonePanel({ zone, onClose, story, storyLoading }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const catColor = zone ? CATEGORY_COLOR[zone.category] : "#ef4444";

  return (
    <AnimatePresence>
      {zone && (
        <motion.aside
          key={zone.id}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 340, damping: 38 }}
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            height: "100dvh",
            width: "clamp(320px, 420px, 100vw)",
            maxWidth: "100vw",
            background: "rgba(5, 8, 15, 0.96)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            borderLeft: "1px solid rgba(255, 80, 80, 0.3)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* ── scrollable body ─────────────────────────────────────── */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(239,68,68,0.3) transparent",
            }}
          >
            {/* ── header bar ─────────────────────────────────────────── */}
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "rgba(5,8,15,0.97)",
                borderBottom: `1px solid ${catColor}30`,
              }}
            >
              {/* Category badge */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  border: `1px solid ${catColor}55`,
                  background: `${catColor}18`,
                  color: catColor,
                  fontFamily: "monospace",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.18em",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: catColor,
                    boxShadow: `0 0 6px ${catColor}`,
                    flexShrink: 0,
                  }}
                />
                {CATEGORY_LABEL[zone.category]}
              </span>

              {/* Close button */}
              <button
                onClick={onClose}
                aria-label="Close panel"
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "18px",
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.25)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
                }}
              >
                ×
              </button>
            </div>

            {/* ── title block ─────────────────────────────────────────── */}
            <div style={{ padding: "18px 18px 0" }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "clamp(20px, 4vw, 26px)",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  color: "#fff",
                  lineHeight: 1.15,
                  textTransform: "uppercase",
                }}
              >
                {zone.name}
              </h2>
              <p
                style={{
                  marginTop: "6px",
                  fontStyle: "italic",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.45)",
                  lineHeight: 1.45,
                }}
              >
                {zone.tagline}
              </p>
            </div>

            {/* ── before/after slider ─────────────────────────────────── */}
            <div style={{ padding: "14px 18px 0" }}>
              <BeforeAfterSlider
                beforeSrc={zone.beforeImage}
                afterSrc={zone.afterImage}
                beforeLabel={`Before ${zone.beforeYear}`}
                afterLabel={`After ${zone.afterYear}`}
              />
            </div>

            {/* ── stats row ───────────────────────────────────────────── */}
            <div
              style={{
                margin: "16px 18px 0",
                padding: "12px 14px",
                borderRadius: "6px",
                border: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.03)",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                gap: "12px 10px",
              }}
            >
              <StatCell label="Culprit" value={zone.culprit} />
              <StatCell label="Year" value={zone.yearOfDamage.toString()} />
              <StatCell label="Impact" value={<SeverityBadge level={zone.severity} />} />
              {zone.areaKm2 != null && (
                <StatCell label="Area" value={`${zone.areaKm2.toLocaleString()} km²`} />
              )}
              {zone.casualties != null && (
                <StatCell label="Casualties" value={zone.casualties.toLocaleString()} />
              )}
              <StatCell label="Country" value={zone.country} />
            </div>

            {/* ── story section ───────────────────────────────────────── */}
            <div style={{ padding: "22px 18px 0" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "12px",
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.22em",
                    color: "#f97316",
                    textTransform: "uppercase",
                  }}
                >
                  ▌ The Story
                </span>
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "linear-gradient(to right, rgba(249,115,22,0.4), transparent)",
                  }}
                />
              </div>

              {storyLoading ? (
                <div>
                  <SkeletonLine width="92%" />
                  <SkeletonLine width="100%" />
                  <SkeletonLine width="87%" />
                  <SkeletonLine width="95%" />
                  <SkeletonLine width="78%" height="12px" />
                  <SkeletonLine width="100%" />
                  <SkeletonLine width="65%" />
                </div>
              ) : story ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: "13.5px",
                    lineHeight: 1.75,
                    color: "rgba(255,255,255,0.72)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {story}
                </p>
              ) : (
                <p
                  style={{
                    margin: 0,
                    fontFamily: "monospace",
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.25)",
                    fontStyle: "italic",
                  }}
                >
                  — No narrative on file —
                </p>
              )}
            </div>

            {/* ── footer: coordinates ─────────────────────────────────── */}
            <div
              style={{
                margin: "24px 18px 20px",
                padding: "10px 12px",
                borderRadius: "4px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "11px",
                  letterSpacing: "0.1em",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                {zone.lat >= 0 ? `${zone.lat.toFixed(4)}°N` : `${Math.abs(zone.lat).toFixed(4)}°S`}
                &nbsp;&nbsp;/&nbsp;&nbsp;
                {zone.lng >= 0 ? `${zone.lng.toFixed(4)}°E` : `${Math.abs(zone.lng).toFixed(4)}°W`}
              </span>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
