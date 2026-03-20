"use client";

import { useEffect, useRef, useState } from "react";
import type { BBox } from "@/lib/store";

// maplibre-gl is loaded via CDN script tag in layout.tsx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { maplibregl: any } }

interface Props {
  bbox: BBox;
}

function waitForMapLibre(): Promise<typeof window.maplibregl> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.maplibregl) return resolve(window.maplibregl);
    let tries = 0;
    const interval = setInterval(() => {
      if (typeof window !== "undefined" && window.maplibregl) {
        clearInterval(interval);
        resolve(window.maplibregl);
      } else if (++tries > 150) {
        clearInterval(interval);
        reject(new Error("MapLibre GL JS did not load from CDN after 15s"));
      }
    }, 100);
  });
}

export default function MiniMap({ bbox }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    waitForMapLibre().then((maplibregl) => {
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: "&copy; OpenStreetMap",
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [(bbox.minLng + bbox.maxLng) / 2, (bbox.minLat + bbox.maxLat) / 2],
        zoom: 12,
        interactive: false,
        attributionControl: false,
      });

      map.on("load", () => {
        map.addSource("area", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [{
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [[
                  [bbox.minLng, bbox.minLat],
                  [bbox.maxLng, bbox.minLat],
                  [bbox.maxLng, bbox.maxLat],
                  [bbox.minLng, bbox.maxLat],
                  [bbox.minLng, bbox.minLat],
                ]],
              },
            }],
          },
        });
        map.addLayer({
          id: "area-fill",
          type: "fill",
          source: "area",
          paint: { "fill-color": "#5B8C3E", "fill-opacity": 0.2 },
        });
        map.addLayer({
          id: "area-border",
          type: "line",
          source: "area",
          paint: { "line-color": "#5B8C3E", "line-width": 2 },
        });
        map.fitBounds(
          [[bbox.minLng, bbox.minLat], [bbox.maxLng, bbox.maxLat]],
          { padding: 30, duration: 0 }
        );
      });

      mapRef.current = map;
    }).catch((err) => {
      console.error("MiniMap load error:", err);
      if (!cancelled) setLoadError(String(err));
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [bbox]);

  if (loadError) {
    return (
      <div className="w-full h-48 bg-red-50 rounded-lg flex items-center justify-center text-red-500 text-xs p-2">
        Map error: {loadError}
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-48 rounded-lg" />;
}
