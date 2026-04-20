"use client";

type Props = {
  lat: number;
  lon: number;
  placeLabel: string;
  /** Google Maps — satellite layer, full zoom UI in a new tab */
  mapUrl: string;
  /** Google Earth Web — search fly-to for this place */
  earthUrl: string;
  /** OpenStreetMap — same coordinates, community map */
  mapUrlOsm: string;
};

/** OSM embed bbox: min_lon, min_lat, max_lon, max_lat (wider span ≈ city context). */
function embedBbox(lat: number, lon: number) {
  const spanLon = 0.055;
  const spanLat = 0.04;
  return `${lon - spanLon},${lat - spanLat},${lon + spanLon},${lat + spanLat}`;
}

export default function AnalyzeLocationMap({ lat, lon, placeLabel, mapUrl, earthUrl, mapUrlOsm }: Props) {
  const bbox = embedBbox(lat, lon);
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;

  return (
    <div className="border-t border-white/10 bg-black/25">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">
          Zoomable map
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-mono">
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-accent-soft hover:text-accent transition-colors">
            Google Maps (satellite) →
          </a>
          <a href={earthUrl} target="_blank" rel="noopener noreferrer" className="text-accent-soft hover:text-accent transition-colors">
            Google Earth →
          </a>
          <a href={mapUrlOsm} target="_blank" rel="noopener noreferrer" className="text-white/45 hover:text-white/75 transition-colors">
            OpenStreetMap →
          </a>
        </div>
      </div>
      <iframe
        title={`Interactive map near ${placeLabel}`}
        src={embedSrc}
        className="w-full h-[min(48vh,440px)] min-h-[280px] border-0 block"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <p className="px-4 py-2 text-[10px] text-white/35 font-mono border-t border-white/8">
        Pan and zoom here; open Google Maps or Earth for full-screen 3D / satellite controls.
      </p>
    </div>
  );
}
