"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, useInView } from "framer-motion";
import StarField from "@/components/StarField";
import LocationSearch from "@/components/LocationSearch";
import PlanetStats from "@/components/PlanetStats";
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

export default function Home() {
  const router = useRouter();
  const globeRef = useRef<GlobeHandle>(null);
  const heroRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = useCallback((place: { name: string; lat: number; lon: number; postalCode?: string }) => {
    const runFlyAndNavigate = () => {
      globeRef.current?.flyTo(place.lat, place.lon, () => {
        const params = new URLSearchParams({
          name: place.name,
          lat: place.lat.toString(),
          lon: place.lon.toString(),
          ...(place.postalCode ? { postal: place.postalCode } : {}),
        });
        router.push(`/analyze?${params.toString()}`);
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
      <section ref={heroRef} className="relative h-screen flex flex-col overflow-hidden">
        <StarField />
        <div className="absolute inset-0 z-[1] hero-ambient" />
        <div className="absolute inset-0 z-0">
          <GlobeView
            ref={globeRef}
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
              Pick a dead zone or search a place to start your climate fork.
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
