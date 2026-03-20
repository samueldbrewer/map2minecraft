"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { BBox } from "@/lib/store";

// maplibre-gl is loaded via CDN script tag in layout.tsx
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { maplibregl: any } }

interface Props {
  bbox: BBox | null;
  onBboxChange: (bbox: BBox) => void;
}

function waitForMapLibre(): Promise<typeof window.maplibregl> {
  return new Promise((resolve, reject) => {
    if (window.maplibregl) return resolve(window.maplibregl);
    let tries = 0;
    const interval = setInterval(() => {
      if (window.maplibregl) {
        clearInterval(interval);
        resolve(window.maplibregl);
      } else if (++tries > 50) { // 5 seconds max
        clearInterval(interval);
        reject(new Error("MapLibre GL failed to load"));
      }
    }, 100);
  });
}

export default function MapInner({ bbox, onBboxChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mlRef = useRef<any>(null);
  const readyRef = useRef(false);
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ lng: number; lat: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    waitForMapLibre().then((maplibregl) => {
      if (cancelled || !containerRef.current) return;
      mlRef.current = maplibregl;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: "raster",
              tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
              tileSize: 256,
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            },
          },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
        center: [0, 30],
        zoom: 3,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        map.addSource("selection", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "selection-fill",
          type: "fill",
          source: "selection",
          paint: { "fill-color": "#5B8C3E", "fill-opacity": 0.15 },
        });
        map.addLayer({
          id: "selection-border",
          type: "line",
          source: "selection",
          paint: { "line-color": "#5B8C3E", "line-width": 2 },
        });
        readyRef.current = true;
        setMapLoaded(true);
      });
    }).catch((err) => {
      console.error("MapLibre load error:", err);
      if (!cancelled) setLoadError(String(err));
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync bbox prop to map
  useEffect(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml || !mapLoaded) return;

    if (!bbox) {
      const source = map.getSource("selection");
      source?.setData({ type: "FeatureCollection", features: [] });
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const source = map.getSource("selection");
    if (source) {
      source.setData({
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
      });
    }

    if (markerRef.current) markerRef.current.remove();
    const centerLng = (bbox.minLng + bbox.maxLng) / 2;
    const centerLat = (bbox.minLat + bbox.maxLat) / 2;
    markerRef.current = new ml.Marker({ color: "#5B8C3E" })
      .setLngLat([centerLng, centerLat])
      .addTo(map);

    map.fitBounds(
      [[bbox.minLng, bbox.minLat], [bbox.maxLng, bbox.maxLat]],
      { padding: 50 }
    );
  }, [bbox, mapLoaded]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const map = mapRef.current;
    if (!map) return;
    map.dragPan.disable();
    const rect = containerRef.current!.getBoundingClientRect();
    const point = map.unproject([e.clientX - rect.left, e.clientY - rect.top]);
    setStartPoint({ lng: point.lng, lat: point.lat });
    setDrawing(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing || !startPoint) return;
    const map = mapRef.current;
    if (!map || !readyRef.current) return;

    const rect = containerRef.current!.getBoundingClientRect();
    const point = map.unproject([e.clientX - rect.left, e.clientY - rect.top]);

    const newBbox: BBox = {
      minLat: Math.min(startPoint.lat, point.lat),
      minLng: Math.min(startPoint.lng, point.lng),
      maxLat: Math.max(startPoint.lat, point.lat),
      maxLng: Math.max(startPoint.lng, point.lng),
    };

    const source = map.getSource("selection");
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [[
              [newBbox.minLng, newBbox.minLat],
              [newBbox.maxLng, newBbox.minLat],
              [newBbox.maxLng, newBbox.maxLat],
              [newBbox.minLng, newBbox.maxLat],
              [newBbox.minLng, newBbox.minLat],
            ]],
          },
        }],
      });
    }
  }, [drawing, startPoint]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (map) map.dragPan.enable();

    if (drawing && startPoint && map && ml) {
      const rect = containerRef.current!.getBoundingClientRect();
      const point = map.unproject([e.clientX - rect.left, e.clientY - rect.top]);

      const finalBbox: BBox = {
        minLat: Math.min(startPoint.lat, point.lat),
        minLng: Math.min(startPoint.lng, point.lng),
        maxLat: Math.max(startPoint.lat, point.lat),
        maxLng: Math.max(startPoint.lng, point.lng),
      };

      const dLat = Math.abs(finalBbox.maxLat - finalBbox.minLat);
      const dLng = Math.abs(finalBbox.maxLng - finalBbox.minLng);
      if (dLat > 0.0001 || dLng > 0.0001) {
        if (markerRef.current) markerRef.current.remove();
        const centerLng = (finalBbox.minLng + finalBbox.maxLng) / 2;
        const centerLat = (finalBbox.minLat + finalBbox.maxLat) / 2;
        markerRef.current = new ml.Marker({ color: "#5B8C3E" })
          .setLngLat([centerLng, centerLat])
          .addTo(map);

        onBboxChange(finalBbox);
      }
    }

    setDrawing(false);
    setStartPoint(null);
  }, [drawing, startPoint, onBboxChange]);

  if (loadError) {
    return (
      <div className="h-[500px] bg-red-50 flex items-center justify-center text-red-500 text-sm p-4">
        Failed to load map: {loadError}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[500px] cursor-crosshair"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}
