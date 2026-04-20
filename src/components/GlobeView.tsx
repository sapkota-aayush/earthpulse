"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import type { DeadZone } from "@/lib/deadZones";

interface Props {
  onReady?: () => void;
  /** Fires when user clicks the globe surface (lat/lng in degrees). */
  onPick?: (lat: number, lng: number) => void;
  deadZones?: DeadZone[];
  onDeadZoneClick?: (zone: DeadZone) => void;
  /** When set, only this dead-zone marker (and its ring) stays visible — others hide until cleared. */
  deadZoneFocusId?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyDeadZoneVisuals(
  g: any,
  zones: DeadZone[] | undefined,
  focusId: string | null,
  /** While flying to a focused dead zone — hide red markers and dz rings so only terrain shows. */
  hideDeadZoneLayer = false
) {
  if (!zones?.length) {
    g.pointsData([]);
    return;
  }
  if (hideDeadZoneLayer) {
    g.pointsData([]);
    const prev = (g.ringsData() as Array<{ __rid?: string; lat?: number; lng?: number }> | undefined) ?? [];
    const nonDz = prev.filter((r) => !String(r.__rid ?? "").startsWith("dz-"));
    g.ringsData(nonDz);
    return;
  }

  const visible = focusId ? zones.filter((z) => z.id === focusId) : zones;
  g.pointsMerge(false)
    .pointsData(visible)
    .pointLat((d: { lat: number }) => d.lat)
    .pointLng((d: { lng: number }) => d.lng)
    .pointAltitude(0.005)
    .pointColor(() => "#ef4444")
    .pointRadius(0.78)
    .pointResolution(12);

  const prev = (g.ringsData() as Array<{ __rid?: string; lat?: number; lng?: number }> | undefined) ?? [];
  const nonDz = prev.filter((r) => !String(r.__rid ?? "").startsWith("dz-"));
  const dzRings = visible.map((z) => ({ lat: z.lat, lng: z.lng, __rid: `dz-${z.id}` }));
  g.ringsData([...nonDz, ...dzRings]);
}

/** Great-circle distance on Earth (km) — for forgiving dead-zone picks on globe clicks. */
function surfaceDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export interface GlobeHandle {
  flyTo: (
    lat: number,
    lon: number,
    onComplete?: () => void,
    opts?: { hideDeadZoneMarkerDuringFlight?: boolean }
  ) => void;
}

function accentRgbTriplet(): string {
  if (typeof window === "undefined") return "56, 189, 248";
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim();
  return raw || "56, 189, 248";
}

/** Valid `r, g, b` for CSS rgba() — three-globe parses this via d3-color; invalid strings can yield null.opacity. */
function sanitizeRgbTriplet(raw: string): string {
  const parts = raw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
  if (parts.length !== 3) return "56, 189, 248";
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const [r0, g0, b0] = parts;
  return `${clamp(r0)}, ${clamp(g0)}, ${clamp(b0)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyGlobeAccent(globe: any) {
  const rgb = sanitizeRgbTriplet(accentRgbTriplet());
  globe.atmosphereColor(`rgba(${rgb}, 0.78)`);
  // Per three-globe: ringColor accessor is (ringDatum) => (t) => colorString
  globe.ringColor(() => (t: number) => {
    const tt = Math.min(1, Math.max(0, Number(t)));
    const a = Math.min(1, Math.max(0, 0.52 * (1 - tt)));
    return `rgba(${rgb}, ${a})`;
  });
  // Do not override pointColor while dead-zone markers are on the same points layer.
  const pts = typeof globe.pointsData === "function" ? (globe.pointsData() as unknown[] | undefined) : undefined;
  if (typeof globe.pointColor === "function" && (!pts || pts.length === 0)) {
    globe.pointColor(() => `rgba(${rgb}, 0.92)`);
  }
}

const ORBITS = [
  { tiltDeg: 28.5,  speed:  0.0028, radius: 120, phase: 0.0  },
  { tiltDeg: -15.0, speed: -0.0020, radius: 134, phase: 1.8  },
  { tiltDeg: 51.6,  speed:  0.0017, radius: 146, phase: 3.2  },
  { tiltDeg: 98.0,  speed:  0.0023, radius: 126, phase: 0.9  },
  { tiltDeg: -42.0, speed: -0.0019, radius: 140, phase: 2.5  },
];

function buildRealisticSatellite(THREE: typeof import("three")) {
  const root = new THREE.Group();

  // ── Main bus (hexagonal prism-ish box) ──
  const busGeo = new THREE.BoxGeometry(4.5, 2.2, 2.2);
  const busMat = new THREE.MeshBasicMaterial({ color: 0xc8cdd6 });
  const bus = new THREE.Mesh(busGeo, busMat);
  root.add(bus);

  // Bus edge highlight
  const busEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(busGeo),
    new THREE.LineBasicMaterial({ color: 0x8899aa, transparent: true, opacity: 0.4 })
  );
  root.add(busEdges);

  // ── Solar arrays (2 × double-panel wings) ──
  const panelMat = new THREE.MeshBasicMaterial({ color: 0x1a2d6e, transparent: true, opacity: 0.95 });
  const cellMat  = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 });

  function makeWing(side: number) {
    const wing = new THREE.Group();

    // Yoke arm
    const yokeGeo = new THREE.BoxGeometry(0.3, 0.3, 3.5);
    const yoke = new THREE.Mesh(yokeGeo, new THREE.MeshBasicMaterial({ color: 0x888ea0 }));
    yoke.position.set(0, 0, side * 1.75);
    wing.add(yoke);

    // Two panels per wing
    for (let p = 0; p < 2; p++) {
      const pGeo = new THREE.BoxGeometry(5.8, 0.12, 2.6);
      const panel = new THREE.Mesh(pGeo, panelMat);
      panel.position.set((p - 0.5) * 6.2, 0, side * 4.6);
      wing.add(panel);

      // Solar cell grid lines
      for (let gx = -2; gx <= 2; gx++) {
        const pts = [
          new THREE.Vector3((p - 0.5) * 6.2 + gx * 1.15, 0.08, side * 4.6 - 1.3),
          new THREE.Vector3((p - 0.5) * 6.2 + gx * 1.15, 0.08, side * 4.6 + 1.3),
        ];
        wing.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cellMat));
      }
      for (let gz = -1; gz <= 1; gz++) {
        const pts = [
          new THREE.Vector3((p - 0.5) * 6.2 - 2.9, 0.08, side * 4.6 + gz * 1.3),
          new THREE.Vector3((p - 0.5) * 6.2 + 2.9, 0.08, side * 4.6 + gz * 1.3),
        ];
        wing.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cellMat));
      }

      // Panel edge frame
      const panelEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(pGeo),
        new THREE.LineBasicMaterial({ color: 0x4899d4, transparent: true, opacity: 0.5 })
      );
      panelEdges.position.copy(panel.position);
      wing.add(panelEdges);
    }
    return wing;
  }

  root.add(makeWing(1));
  root.add(makeWing(-1));

  // ── Dish antenna ──
  const dishCurve = new THREE.EllipseCurve(0, 0, 1.1, 0.8, 0, Math.PI * 2);
  const dishPts = dishCurve.getPoints(24);
  const dishRingGeo = new THREE.BufferGeometry().setFromPoints(dishPts.map(p => new THREE.Vector3(p.x, p.y, 0)));
  const dishRing = new THREE.LineLoop(dishRingGeo, new THREE.LineBasicMaterial({ color: 0xddddee, transparent: true, opacity: 0.7 }));
  dishRing.position.set(2.6, 1.4, 0);
  dishRing.rotation.x = Math.PI / 5;
  root.add(dishRing);

  // Dish spokes
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const sp = [
      new THREE.Vector3(2.6, 1.4, 0),
      new THREE.Vector3(2.6 + Math.cos(a) * 1.1, 1.4 + Math.sin(a) * 0.8, 0),
    ];
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(sp),
      new THREE.LineBasicMaterial({ color: 0xbbbbcc, transparent: true, opacity: 0.5 })));
  }

  // Dish arm
  const armPts = [new THREE.Vector3(2.2, 1.1, 0), new THREE.Vector3(2.6, 1.4, 0)];
  root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(armPts),
    new THREE.LineBasicMaterial({ color: 0x999aaa, transparent: true, opacity: 0.6 })));

  // ── Thruster nozzles (4 corners) ──
  const thrusterMat = new THREE.MeshBasicMaterial({ color: 0x444455 });
  [[-2, 1, 1], [-2, -1, 1], [-2, 1, -1], [-2, -1, -1]].forEach(([x, y, z]) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.4, 6), thrusterMat);
    t.position.set(x, y * 1.1, z * 1.1);
    t.rotation.z = Math.PI / 2;
    root.add(t);
  });

  // ── Star tracker cylinder ──
  const tracker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.7, 8),
    new THREE.MeshBasicMaterial({ color: 0x1a1a2e })
  );
  tracker.position.set(-1.5, 1.35, 0.5);
  tracker.rotation.z = Math.PI / 2.5;
  root.add(tracker);

  // ── Subtle glow halo ──
  root.add(new THREE.Mesh(
    new THREE.SphereGeometry(7, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.025 })
  ));

  return root;
}

/** Same convention as three-globe (`GLOBE_RADIUS = 100`, `relAltitude` in radii above surface). */
function latLngAltToVector3(THREE: typeof import("three"), lat: number, lng: number, relAltitude: number) {
  const R = 100;
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lng) * Math.PI) / 180;
  const r = R * (1 + relAltitude);
  const sinPhi = Math.sin(phi);
  return new THREE.Vector3(r * sinPhi * Math.cos(theta), r * Math.cos(phi), r * sinPhi * Math.sin(theta));
}

function makeCloudSprite(THREE: typeof import("three")) {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(48, 48, 0, 48, 48, 44);
    g.addColorStop(0, "rgba(240, 248, 255, 0.42)");
    g.addColorStop(0.45, "rgba(200, 210, 230, 0.18)");
    g.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 96, 96);
  }
  const map = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, opacity: 0.38 });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(26, 18, 1);
  return sprite;
}

/** Lead craft during flyTo — same detailed mesh as orbital satellites (`buildRealisticSatellite`). */
interface FollowLeadState {
  root: import("three").Group;
  spinPart: import("three").Object3D;
  clouds: import("three").Group;
}

function buildFollowLeadSatellite(THREE: typeof import("three")): FollowLeadState {
  const root = new THREE.Group();
  const sat = buildRealisticSatellite(THREE);
  // A touch larger than background sats so it reads clearly during the dive
  sat.scale.setScalar(0.62);
  sat.rotation.set(0.42, 0.9, -0.28);
  root.add(sat);

  const clouds = new THREE.Group();
  const positions: [number, number, number][] = [
    [5, 2, -4],
    [-6, 1, 3],
    [3, -3, 5],
    [-4, 3, -5],
    [0, 5, 2],
  ];
  for (const [x, y, z] of positions) {
    const s = makeCloudSprite(THREE);
    s.position.set(x, y, z);
    clouds.add(s);
  }
  root.add(clouds);

  root.visible = false;
  return { root, spinPart: sat, clouds };
}

/** Single smooth camera tween duration (ms) — matches globe.gl Cubic.InOut tween. */
const FLY_TO_DIVE_MS = 6200;

const GlobeView = forwardRef<GlobeHandle, Props>(({ onReady, onPick, deadZones, onDeadZoneClick, deadZoneFocusId }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeInstanceRef = useRef<any>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const onDeadZoneClickRef = useRef(onDeadZoneClick);
  onDeadZoneClickRef.current = onDeadZoneClick;
  const deadZonesRef = useRef(deadZones);
  deadZonesRef.current = deadZones;
  const deadZoneFocusIdRef = useRef<string | null>(deadZoneFocusId ?? null);
  deadZoneFocusIdRef.current = deadZoneFocusId ?? null;
  /** True while `flyTo` runs after a dead-zone marker click — keeps markers off until navigation or fly end. */
  const deadZoneFlyHideLayerRef = useRef(false);
  const flyGenRef = useRef(0);
  const flyRafRef = useRef<number | null>(null);
  const followLeadStateRef = useRef<FollowLeadState | null>(null);
  const threeModuleRef = useRef<typeof import("three") | null>(null);
  /** OrbitControls defaults after mount — used to restore after flyTo (avoids bad saves mid-flight). */
  const orbitIdleRef = useRef<{
    enableDamping: boolean;
    dampingFactor: number;
    enableRotate: boolean;
    enableZoom: boolean;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    /** Multi-stage dive: camera follows a lead satellite down to the tile. */
    flyTo: (lat: number, lon: number, onComplete?: () => void, opts?: { hideDeadZoneMarkerDuringFlight?: boolean }) => {
      const g = globeInstanceRef.current;
      if (!g) return;
      if (flyRafRef.current != null) {
        cancelAnimationFrame(flyRafRef.current);
        flyRafRef.current = null;
      }
      flyGenRef.current += 1;
      const gen = flyGenRef.current;
      g.controls().autoRotate = false;

      const hideDuringFly = !!opts?.hideDeadZoneMarkerDuringFlight;
      deadZoneFlyHideLayerRef.current = hideDuringFly;
      if (hideDuringFly) {
        applyDeadZoneVisuals(g, deadZonesRef.current, deadZoneFocusIdRef.current, true);
      }

      const lead = followLeadStateRef.current;
      if (lead) {
        lead.root.visible = true;
      }

      // Orbit damping + rotate fight the camera tween — disable for the dive, then restore idle defaults.
      const ctr = g.controls();
      const idle = orbitIdleRef.current ?? {
        enableDamping: true,
        dampingFactor: 0.055,
        enableRotate: true,
        enableZoom: true,
      };
      ctr.enableDamping = false;
      ctr.enableRotate = false;
      ctr.enableZoom = false;
      ctr.autoRotate = false;
      ctr.update();

      // Lead satellite tracks live POV so it stays glued to the camera path (no eased mismatch).
      const diveStart = performance.now();
      const tickFollow = () => {
        if (flyGenRef.current !== gen) return;
        const t = Math.min(1, (performance.now() - diveStart) / FLY_TO_DIVE_MS);

        const THREE = threeModuleRef.current;
        if (lead && THREE) {
          const pov = g.pointOfView() as { lat?: number; lng?: number; altitude?: number };
          const camAlt =
            typeof pov.altitude === "number" && Number.isFinite(pov.altitude) ? pov.altitude : 0.09;
          const dAlt = Math.max(0.02, camAlt * 1.12 + 0.012);

          const pos = latLngAltToVector3(THREE, lat, lon, dAlt);
          lead.root.position.copy(pos);
          lead.root.up.copy(pos.clone().normalize());
          lead.root.lookAt(0, 0, 0);
          const mist = Math.sin(t * Math.PI);
          lead.clouds.children.forEach((ch) => {
            const spr = ch as import("three").Sprite;
            const m = spr.material as import("three").SpriteMaterial;
            m.opacity = 0.1 + 0.28 * mist * (1 - t * 0.5);
          });
        }

        if (t < 1) {
          flyRafRef.current = requestAnimationFrame(tickFollow);
        } else {
          flyRafRef.current = null;
        }
      };
      flyRafRef.current = requestAnimationFrame(tickFollow);

      // One tween (Cubic.InOut inside globe.gl) avoids stacked tweens that stutter mid-dive.
      g.pointOfView({ lat, lng: lon, altitude: 0.085 }, FLY_TO_DIVE_MS);

      setTimeout(() => {
        if (flyGenRef.current !== gen) return;
        if (flyRafRef.current != null) {
          cancelAnimationFrame(flyRafRef.current);
          flyRafRef.current = null;
        }
        ctr.enableDamping = idle.enableDamping;
        ctr.dampingFactor = idle.dampingFactor;
        ctr.enableRotate = idle.enableRotate;
        ctr.enableZoom = idle.enableZoom;
        ctr.update();

        deadZoneFlyHideLayerRef.current = false;
        // After a dead-zone dive we navigate away — skip re-draw to avoid one frame of red dot flash.
        if (!deadZoneFocusIdRef.current) {
          applyDeadZoneVisuals(g, deadZonesRef.current, deadZoneFocusIdRef.current, false);
        }
        if (followLeadStateRef.current) followLeadStateRef.current.root.visible = false;
        onComplete?.();
      }, FLY_TO_DIVE_MS + 400);
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;
    let animFrame: number;
    let accentObserver: MutationObserver | null = null;
    /** Clears orbit auto-rotate helpers (listener + resume timer). */
    let disposeOrbitAssist: (() => void) | null = null;

    Promise.all([import("globe.gl"), import("three")]).then(([mod, THREE]) => {
      if (destroyed || !containerRef.current) return;
      threeModuleRef.current = THREE;
      // globe.gl is a Kapsule component: first call returns the API, second mounts on the DOM node.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createGlobe = mod.default as unknown as () => (el: HTMLElement) => any;

      const globe = createGlobe()(containerRef.current)
        .globeImageUrl(null as unknown as string)
        .bumpImageUrl(null as unknown as string)
        .globeTileEngineUrl((x: number, y: number, z: number) =>
          `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
        )
        .globeTileEngineMaxLevel(18)
        .globeCurvatureResolution(2)
        .atmosphereAltitude(0.26)
        .width(containerRef.current.clientWidth)
        .height(containerRef.current.clientHeight)
        .backgroundColor("rgba(0,0,0,0)")
        .enablePointerInteraction(true)
        .ringMaxRadius(5.5)
        .ringPropagationSpeed(3.1)
        .ringRepeatPeriod(2400);

      const renderer = globe.renderer?.();
      if (renderer?.setPixelRatio) {
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      }

      applyGlobeAccent(globe);
      globe
        .pointsTransitionDuration(200)
        .pointLat((d: { lat: number }) => d.lat)
        .pointLng((d: { lng: number }) => d.lng)
        .pointAltitude((d: { alt: number }) => d.alt)
        .pointRadius(0.52)
        .pointsData([]);

      const ctr = globe.controls();
      ctr.autoRotate = true;
      ctr.autoRotateSpeed = 0.12;
      ctr.enableZoom = true;
      ctr.enableRotate = true;
      ctr.enablePan = false;
      ctr.minDistance = 101.2;
      ctr.maxDistance = 520;
      ctr.enableDamping = true;
      ctr.dampingFactor = 0.055;

      orbitIdleRef.current = {
        enableDamping: ctr.enableDamping,
        dampingFactor: ctr.dampingFactor,
        enableRotate: ctr.enableRotate,
        enableZoom: ctr.enableZoom,
      };

      // Stop drift while interacting: pointerdown (before click lands) + orbit drag both pause auto-rotate
      let autoResumeTimer: ReturnType<typeof setTimeout> | null = null;
      const pauseAutoRotate = () => {
        ctr.autoRotate = false;
        if (autoResumeTimer) clearTimeout(autoResumeTimer);
        autoResumeTimer = setTimeout(() => {
          autoResumeTimer = null;
          ctr.autoRotate = true;
        }, 9000);
      };
      const mountEl = containerRef.current!;
      const onPointerDown = () => pauseAutoRotate();
      mountEl.addEventListener("pointerdown", onPointerDown);
      const onOrbitStart = () => pauseAutoRotate();
      ctr.addEventListener("start", onOrbitStart);
      disposeOrbitAssist = () => {
        mountEl.removeEventListener("pointerdown", onPointerDown);
        ctr.removeEventListener("start", onOrbitStart);
        if (autoResumeTimer) {
          clearTimeout(autoResumeTimer);
          autoResumeTimer = null;
        }
      };

      accentObserver = new MutationObserver(() => applyGlobeAccent(globe));
      accentObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-accent"] });

      globe.onPointClick((zone: DeadZone) => {
        pauseAutoRotate();
        if (zone && typeof zone === "object" && "id" in zone && "lat" in zone) {
          onDeadZoneClickRef.current?.(zone as DeadZone);
        }
      });

      globe.onGlobeClick((coords: { lat: number; lng: number }) => {
        pauseAutoRotate();
        // Fallback: nearest dead zone within ~520 km if the point mesh was missed (orbit drag, edge clicks).
        const zones = deadZonesRef.current;
        if (zones && zones.length > 0) {
          let closest: (typeof zones)[0] | null = null;
          let minKm = Infinity;
          for (const z of zones) {
            const km = surfaceDistanceKm(coords.lat, coords.lng, z.lat, z.lng);
            if (km < minKm) {
              minKm = km;
              closest = z;
            }
          }
          if (closest && minKm < 520) {
            onDeadZoneClickRef.current?.(closest);
            return;
          }
        }
        onPickRef.current?.(coords.lat, coords.lng);
        const ring = { lat: coords.lat, lng: coords.lng, __rid: Math.random() };
        const prev = globe.ringsData() as Array<{ lat: number; lng: number; __rid: number }> | undefined;
        globe.ringsData([...(prev ?? []), ring]);
        const rid = ring.__rid;
        window.setTimeout(() => {
          const cur = globe.ringsData() as Array<{ __rid?: number }> | undefined;
          globe.ringsData((cur ?? []).filter((r) => r.__rid !== rid));
        }, 2100);
      });

      if (deadZones && deadZones.length > 0) {
        applyDeadZoneVisuals(globe, deadZones, deadZoneFocusId ?? null, deadZoneFlyHideLayerRef.current);
      }

      // Orbit rings
      ORBITS.forEach(({ tiltDeg, radius }) => {
        const pts = Array.from({ length: 257 }, (_, i) => {
          const a = (i / 256) * Math.PI * 2;
          return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
        });
        const ring = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07 })
        );
        ring.rotation.x = (tiltDeg * Math.PI) / 180;
        globe.scene().add(ring);
      });

      // Satellites
      const sats = ORBITS.map((orbit) => {
        const sat = buildRealisticSatellite(THREE);
        sat.scale.setScalar(0.55);
        globe.scene().add(sat);
        return { mesh: sat, angle: orbit.phase, ...orbit };
      });

      followLeadStateRef.current = buildFollowLeadSatellite(THREE);
      globe.scene().add(followLeadStateRef.current.root);

      // Faint telemetry lines
      const linkMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05 });
      for (let i = 0; i < 6; i++) {
        const a1 = Math.random() * Math.PI * 2, a2 = Math.random() * Math.PI * 2;
        globe.scene().add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(Math.cos(a1) * 102, Math.sin(a1 * 0.4) * 55, Math.sin(a1) * 102),
            new THREE.Vector3(Math.cos(a2) * 136, Math.sin(a2 * 0.4) * 75, Math.sin(a2) * 136),
          ]),
          linkMat
        ));
      }

      const animate = () => {
        animFrame = requestAnimationFrame(animate);
        globe.controls()?.update?.();
        const lead = followLeadStateRef.current;
        if (lead?.root.visible) {
          lead.spinPart.rotation.y += 0.014;
        }
        sats.forEach((s) => {
          s.angle += s.speed;
          const cosT = Math.cos((s.tiltDeg * Math.PI) / 180);
          const sinT = Math.sin((s.tiltDeg * Math.PI) / 180);
          const x = Math.cos(s.angle) * s.radius;
          const zFlat = Math.sin(s.angle) * s.radius;
          s.mesh.position.set(x, sinT * zFlat, cosT * zFlat);
          // Orient along velocity vector
          s.mesh.rotation.y = -s.angle;
          s.mesh.rotation.z = (s.tiltDeg * Math.PI) / 180 * 0.3;
        });
      };
      animate();

      globeInstanceRef.current = globe;
      onReady?.();
    });

    const handleResize = () => {
      if (!containerRef.current || !globeInstanceRef.current) return;
      const g = globeInstanceRef.current;
      g.width(containerRef.current.clientWidth);
      g.height(containerRef.current.clientHeight);
      const renderer = g.renderer?.();
      if (renderer?.setPixelRatio) {
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      destroyed = true;
      accentObserver?.disconnect();
      disposeOrbitAssist?.();
      disposeOrbitAssist = null;
      cancelAnimationFrame(animFrame);
      flyGenRef.current += 1;
      if (flyRafRef.current != null) {
        cancelAnimationFrame(flyRafRef.current);
        flyRafRef.current = null;
      }
      try {
        globeInstanceRef.current?.pointsData?.([]);
      } catch {
        /* ignore */
      }
      const leadCleanup = followLeadStateRef.current;
      if (leadCleanup) {
        try {
          globeInstanceRef.current?.scene?.()?.remove?.(leadCleanup.root);
        } catch {
          /* ignore */
        }
        followLeadStateRef.current = null;
      }
      threeModuleRef.current = null;
      window.removeEventListener("resize", handleResize);
    };
  }, [onReady]);

  useEffect(() => {
    const g = globeInstanceRef.current;
    if (!g) return;
    applyDeadZoneVisuals(g, deadZones, deadZoneFocusId ?? null, deadZoneFlyHideLayerRef.current);
  }, [deadZones, deadZoneFocusId]);

  return <div ref={containerRef} className="w-full h-full" />;
});

GlobeView.displayName = "GlobeView";
export default GlobeView;
