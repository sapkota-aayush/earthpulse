"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface Props {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel: string;
  afterLabel: string;
}

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel,
  afterLabel,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // position as a fraction 0–1
  const position = useMotionValue(0.5);
  const [posPercent, setPosPercent] = useState(50);

  // Keep posPercent in sync with motion value for CSS
  useEffect(() => {
    return position.on("change", (v) => setPosPercent(v * 100));
  }, [position]);

  // Measure container width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.offsetWidth));
    ro.observe(el);
    setContainerWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // Intro animation: 0.5 → 0.25 to tease the damaged "after" side
  useEffect(() => {
    const controls = animate(position, 0.25, {
      delay: 0.6,
      duration: 1.2,
      ease: [0.4, 0, 0.2, 1],
    });
    return controls.stop;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clamp = (v: number) => Math.max(0.02, Math.min(0.98, v));

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      position.set(clamp((clientX - rect.left) / rect.width));
    },
    [position]
  );

  // Mouse handlers
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateFromClientX(e.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => updateFromClientX(e.clientX);
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, updateFromClientX]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    updateFromClientX(e.touches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    updateFromClientX(e.touches[0].clientX);
  };

  const clipWidth = `${posPercent}%`;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden select-none"
      style={{ aspectRatio: "16 / 9", background: "#000", cursor: isDragging ? "ew-resize" : "col-resize" }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
      {/* AFTER image — full width, always visible underneath */}
      <img
        src={afterSrc}
        alt="After"
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />

      {/* BEFORE image — clipped from the left */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          width: clipWidth,
        }}
      >
        <img
          src={beforeSrc}
          alt="Before"
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: containerWidth || "100%",
            maxWidth: "none",
            height: "100%",
            objectFit: "cover",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Drag handle */}
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: clipWidth,
          transform: "translateX(-50%)",
          width: "2px",
          background: "rgba(255,255,255,0.9)",
          boxShadow: "0 0 12px 2px rgba(249,115,22,0.7), 0 0 3px rgba(255,255,255,0.8)",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        {/* Circular grabber */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "rgba(5,8,15,0.9)",
            border: "2px solid rgba(255,255,255,0.85)",
            boxShadow: "0 0 16px rgba(249,115,22,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "13px",
            color: "rgba(255,255,255,0.9)",
            fontWeight: 700,
            letterSpacing: "-1px",
            userSelect: "none",
            pointerEvents: "none",
            zIndex: 11,
          }}
        >
          ◀▶
        </div>
      </motion.div>

      {/* BEFORE label — bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          zIndex: 5,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: "rgba(5,8,15,0.75)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff",
            fontFamily: "monospace",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            padding: "3px 8px",
            borderRadius: "4px",
            textTransform: "uppercase",
          }}
        >
          {beforeLabel}
        </span>
      </div>

      {/* AFTER label — bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          right: "10px",
          zIndex: 5,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: "rgba(5,8,15,0.75)",
            border: "1px solid rgba(239,68,68,0.5)",
            color: "#fca5a5",
            fontFamily: "monospace",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            padding: "3px 8px",
            borderRadius: "4px",
            textTransform: "uppercase",
          }}
        >
          {afterLabel}
        </span>
      </div>

      {/* Subtle red vignette on after side */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to left, rgba(239,68,68,0.08) 0%, transparent ${posPercent}%)`,
          pointerEvents: "none",
          zIndex: 4,
        }}
      />
    </div>
  );
}
