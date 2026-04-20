"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

interface Props {
  onSelect: (place: { name: string; lat: number; lon: number; postalCode?: string }) => void;
  showPostalCode?: boolean;
}

export default function LocationSearch({ onSelect, showPostalCode }: Props) {
  const [query, setQuery] = useState("");
  const [postal, setPostal] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query.length < 3) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const q = postal ? `${query} ${postal}` : query;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`
        );
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, postal]);

  const pick = (s: Suggestion) => {
    setQuery(s.display_name.split(",")[0]);
    setSuggestions([]);
    onSelect({
      name: s.display_name,
      lat: parseFloat(s.lat),
      lon: parseFloat(s.lon),
      postalCode: postal || undefined,
    });
  };

  return (
    <div className="relative w-full flex flex-col gap-3">
      {/* Main search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-soft text-xs font-mono tracking-widest">
          LOC
        </span>
        <input
          id="earthpulse-location-search"
          type="text"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            if (value.length < 3) {
              setSuggestions([]);
              setLoading(false);
            }
          }}
          placeholder="neighbourhood, city, or address"
          className="field-input w-full pl-14 pr-5 py-4 rounded-xl text-sm font-light tracking-wide"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border border-[rgba(var(--accent-rgb),0.25)] border-t-[rgb(var(--accent-rgb))] rounded-full animate-spin" />
        )}
      </div>

      {/* Optional postal code */}
      {showPostalCode && (
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-theme-faint text-xs font-mono tracking-widest">
            ZIP
          </span>
          <input
            type="text"
            value={postal}
            onChange={(e) => setPostal(e.target.value)}
            placeholder="postal / zip code (optional — for street-level accuracy)"
            className="field-input w-full pl-14 pr-5 py-3 rounded-xl text-xs font-mono"
          />
        </div>
      )}

      {/* Suggestions */}
      <AnimatePresence>
        {suggestions.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute top-full left-0 right-0 mt-2 z-[60] w-full max-h-52 overflow-y-auto rounded-2xl glass backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
          >
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  onClick={() => pick(s)}
                  className="w-full text-left px-5 py-3.5 text-xs text-theme-muted hover:bg-accent-muted hover:text-accent transition-colors border-b border-theme-border last:border-0 font-light"
                >
                  {s.display_name}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
