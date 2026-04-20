"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, useInView } from "framer-motion";
import StarField from "@/components/StarField";
import LocationSearch from "@/components/LocationSearch";
import PlanetStats from "@/components/PlanetStats";
import ScanOverlay, { SCAN_OVERLAY_SEQUENCE_MS } from "@/components/ScanOverlay";
import { DEAD_ZONES, type DeadZone } from "@/lib/deadZones";
import type { GlobeHandle } from "@/components/GlobeView";

const GlobeView = dynamic(() => import("@/components/GlobeView"), { ssr: false });

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

function satImageUrl(lat: number, lon: number) {
  return `/api/satellite?lat=${lat}&lon=${lon}`;
}

export default function Home() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ name: string; lat: number; lon: number; postalCode?: string } | null>(null);
  const [globeDraft, setGlobeDraft] = useState<{ lat: number; lon: number; label: string; loading: boolean } | null>(null);
  const globeRef = useRef<GlobeHandle>(null);
  const heroRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const pickAbortRef = useRef<AbortController | null>(null);
  const pickDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** While flying to a dead zone, hide all other red markers until navigation completes. */
  const [deadZoneFocusId, setDeadZoneFocusId] = useState<string | null>(null);

  const handleDeadZoneClick = useCallback((zone: DeadZone) => {
    setDeadZoneFocusId(zone.id);
    globeRef.current?.flyTo(
      zone.lat,
      zone.lng,
      () => {
        router.push(`/deadzone/${zone.id}`);
      },
      { hideDeadZoneMarkerDuringFlight: true }
    );
  }, [router]);

  const reverseGeocode = useCallback(async (lat: number, lon: number, signal?: AbortSignal) => {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=12&addressdetails=1`,
      { headers: { "Accept-Language": "en" }, signal }
    );
    if (!res.ok) throw new Error("reverse failed");
    const j = await res.json();
    return (j.display_name as string) || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }, []);

  const handleGlobePick = useCallback((lat: number, lng: number) => {
    setGlobeDraft({ lat, lon: lng, label: "Resolving place name…", loading: true });
    if (pickDebounceRef.current) clearTimeout(pickDebounceRef.current);
    pickDebounceRef.current = setTimeout(() => {
      pickAbortRef.current?.abort();
      pickAbortRef.current = new AbortController();
      const { signal } = pickAbortRef.current;
      reverseGeocode(lat, lng, signal)
        .then((label) => {
          if (signal.aborted) return;
          setGlobeDraft({ lat, lon: lng, label, loading: false });
        })
        .catch(() => {
          if (signal.aborted) return;
          setGlobeDraft({ lat, lon: lng, label: `${lat.toFixed(3)}°, ${lng.toFixed(3)}°`, loading: false });
        });
    }, 100);
  }, [reverseGeocode]);

  const handleSelect = useCallback((place: { name: string; lat: number; lon: number; postalCode?: string }) => {
    setSelectedPlace(place);
    setScanning(false);

    const runFlyAndNavigate = () => {
      globeRef.current?.flyTo(place.lat, place.lon, () => {
        setScanning(true);
        window.setTimeout(() => {
          const params = new URLSearchParams({
            name: place.name,
            lat: place.lat.toString(),
            lon: place.lon.toString(),
            ...(place.postalCode ? { postal: place.postalCode } : {}),
          });
          router.push(`/analyze?${params.toString()}`);
        }, SCAN_OVERLAY_SEQUENCE_MS + 1600);
      });
    };

    // If user picked from the lower search block, scroll back to the hero so the globe dive is visible.
    if (typeof window !== "undefined" && window.scrollY > 120) {
      heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(runFlyAndNavigate, 580);
    } else {
      runFlyAndNavigate();
    }
  }, [router]);

  const scrollToSearch = useCallback(() => {
    searchRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      document.getElementById("earthpulse-location-search")?.focus({ preventScroll: true });
    }, 480);
  }, []);

  return (
    <main className="min-h-screen theme-bg theme-fg">
      <ScanOverlay
        visible={scanning}
        lat={selectedPlace?.lat ?? 0}
        lon={selectedPlace?.lon ?? 0}
        locationName={selectedPlace?.name ?? ""}
        satImage={selectedPlace ? satImageUrl(selectedPlace.lat, selectedPlace.lon) : null}
      />

      <section ref={heroRef} className="relative h-screen flex flex-col overflow-hidden">
        <StarField />
        <div className="absolute inset-0 z-[1] hero-ambient" />
        <div className="absolute inset-0 z-0">
          <GlobeView
            ref={globeRef}
            onPick={handleGlobePick}
            deadZones={DEAD_ZONES}
            onDeadZoneClick={handleDeadZoneClick}
            deadZoneFocusId={deadZoneFocusId}
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none h-[52%] hero-vignette-bottom" />
        <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none h-[22%] hero-vignette-top" />

        <div className="relative z-20 flex items-start sm:items-center justify-between gap-4 px-5 sm:px-10 pt-7 sm:pt-9">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(var(--accent-rgb),0.22)] bg-[color-mix(in_oklab,var(--surface-1)_75%,transparent)] px-3 py-1 w-fit backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent-rgb))] shadow-[0_0_10px_rgba(var(--accent-rgb),0.7)]" aria-hidden />
              <span className="text-[10px] sm:text-xs tracking-[0.28em] uppercase font-mono text-accent-soft">EarthPulse</span>
            </div>
            <span className="text-theme-muted text-[11px] sm:text-xs font-mono max-w-[16rem] sm:max-w-xs leading-relaxed">
              Tap the globe or search — satellite lead-in, then your fork.
            </span>
          </div>
          <button
            type="button"
            onClick={scrollToSearch}
            className="shrink-0 rounded-full border border-[rgba(var(--accent-rgb),0.28)] bg-accent-muted/80 px-4 py-2 text-[10px] font-mono text-accent tracking-[0.2em] uppercase hover:brightness-110 transition-all"
          >
            Search
          </button>
        </div>

        <div className="absolute z-30 bottom-8 sm:bottom-12 left-4 sm:left-10 flex flex-col gap-3 max-w-sm w-[min(20rem,calc(100vw-2rem))] pointer-events-auto">
          {globeDraft && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.85 }}
            >
              <div className="glass rounded-2xl border border-[rgba(var(--accent-rgb),0.22)] px-4 py-3 flex flex-col gap-3">
                <div className="min-w-0">
                  <p className="text-accent-soft text-[10px] font-mono tracking-widest uppercase mb-1">Globe pick</p>
                  <p className="text-theme-primary/90 text-sm truncate">{globeDraft.loading ? "Locking coordinates…" : globeDraft.label}</p>
                  <p className="text-theme-faint text-[11px] font-mono mt-0.5">
                    {globeDraft.lat.toFixed(4)}°, {globeDraft.lon.toFixed(4)}° · drag · wheel zoom
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setGlobeDraft(null)}
                    className="px-3 py-2 rounded-full border border-theme-border text-theme-muted text-xs font-mono hover:border-[rgba(var(--accent-rgb),0.35)] hover:text-theme-primary transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    disabled={globeDraft.loading}
                    onClick={() => {
                      const p = globeDraft;
                      setGlobeDraft(null);
                      handleSelect({ name: p.label, lat: p.lat, lon: p.lon });
                    }}
                    className="px-3 py-2 rounded-full bg-accent-muted border border-[rgba(var(--accent-rgb),0.45)] text-accent text-xs font-mono hover:brightness-110 disabled:opacity-40 transition-colors"
                  >
                    Scan this point
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      <PlanetStats />

      <section className="max-w-3xl mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <FadeIn>
          <div className="glass rounded-3xl border border-[rgba(var(--accent-rgb),0.12)] px-5 py-8 sm:px-8 sm:py-10">
            <p className="text-accent-soft font-mono text-[10px] tracking-[0.32em] uppercase text-center mb-5">Flow</p>
            <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-[11px] sm:text-sm leading-snug">
              {["Pick a place", "Orbit dive", "Area brief", "Fork + duel", "Sim"].map((label, i) => (
                <span key={label} className="inline-flex items-center gap-1">
                  {i > 0 ? (
                    <span className="text-theme-faint font-mono text-[10px] px-0.5 select-none" aria-hidden>
                      →
                    </span>
                  ) : null}
                  <span className="rounded-full border border-theme-border bg-[color-mix(in_oklab,var(--surface-1)_92%,transparent)] px-3 py-1.5 font-medium text-theme-primary/95">
                    {label}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      <section
        ref={searchRef}
        id="earthpulse-search-section"
        className="scroll-mt-24 py-20 px-6 max-w-xl mx-auto w-full"
      >
        <FadeIn>
          <h2 className="text-2xl md:text-3xl font-light text-center mb-3 text-theme-primary/95">
            Where is your stress pin?
          </h2>
          <p className="text-theme-muted text-sm text-center mb-10 max-w-md mx-auto leading-relaxed">
            Try a city or neighbourhood (e.g. Kingston). We&apos;ll pull you back to the globe for a drone-style dive, then open your report.
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="relative z-20 min-h-[200px] pb-6">
            <LocationSearch onSelect={handleSelect} showPostalCode />
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="mt-10 pt-6 border-t border-theme-border text-theme-faint text-xs font-mono text-center leading-relaxed">
            No account · No tracking · Open data sources
          </p>
        </FadeIn>
      </section>
    </main>
  );
}
