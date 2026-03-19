"use client";

import { useEffect, useRef, useState } from "react";
import type { BBox } from "@/lib/store";

interface Props {
  bbox: BBox;
}

export default function MiniMap({ bbox }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const maplibreglModule = await import("maplibre-gl");
        const maplibregl = maplibreglModule.default || maplibreglModule;
        await import("maplibre-gl/dist/maplibre-gl.css");

        if (cancelled || !containerRef.current) return;

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: {
            version: 8 as const,
            sources: {
              osm: {
                type: "raster" as const,
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: "&copy; OpenStreetMap",
              },
            },
            layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
          },
          center: [(bbox.minLng + bbox.maxLng) / 2, (bbox.minLat + bbox.maxLat) / 2] as [number, number],
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
      } catch (err) {
        console.error("Failed to load MiniMap:", err);
        setLoadError(String(err));
      }
    })();

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
