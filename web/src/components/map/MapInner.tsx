"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BBox } from "@/lib/store";

interface Props {
  bbox: BBox | null;
  onBboxChange: (bbox: BBox) => void;
}

export default function MapInner({ bbox, onBboxChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ lng: number; lat: number } | null>(null);
  const readyRef = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

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
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Sync bbox prop to map (selection rect + marker + fly)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!bbox) {
      // Clear selection
      if (readyRef.current) {
        const source = map.getSource("selection") as maplibregl.GeoJSONSource | undefined;
        source?.setData({ type: "FeatureCollection", features: [] });
      }
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    // Update selection rect
    const updateOnReady = () => {
      const source = map.getSource("selection") as maplibregl.GeoJSONSource | undefined;
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

      // Update marker
      if (markerRef.current) {
        markerRef.current.remove();
      }
      const centerLng = (bbox.minLng + bbox.maxLng) / 2;
      const centerLat = (bbox.minLat + bbox.maxLat) / 2;
      markerRef.current = new maplibregl.Marker({ color: "#5B8C3E" })
        .setLngLat([centerLng, centerLat])
        .addTo(map);

      // Fit bounds
      map.fitBounds(
        [[bbox.minLng, bbox.minLat], [bbox.maxLng, bbox.maxLat]],
        { padding: 50 }
      );
    };

    if (readyRef.current) {
      updateOnReady();
    } else {
      map.on("load", updateOnReady);
    }
  }, [bbox]);

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

    // Update selection rect directly (don't fly to bounds during drag)
    const source = map.getSource("selection") as maplibregl.GeoJSONSource | undefined;
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
    if (map) map.dragPan.enable();

    if (drawing && startPoint && map) {
      const rect = containerRef.current!.getBoundingClientRect();
      const point = map.unproject([e.clientX - rect.left, e.clientY - rect.top]);

      const finalBbox: BBox = {
        minLat: Math.min(startPoint.lat, point.lat),
        minLng: Math.min(startPoint.lng, point.lng),
        maxLat: Math.max(startPoint.lat, point.lat),
        maxLng: Math.max(startPoint.lng, point.lng),
      };

      // Only set bbox if area is meaningful (not just a click)
      const dLat = Math.abs(finalBbox.maxLat - finalBbox.minLat);
      const dLng = Math.abs(finalBbox.maxLng - finalBbox.minLng);
      if (dLat > 0.0001 || dLng > 0.0001) {
        // Update marker
        if (markerRef.current) markerRef.current.remove();
        const centerLng = (finalBbox.minLng + finalBbox.maxLng) / 2;
        const centerLat = (finalBbox.minLat + finalBbox.maxLat) / 2;
        markerRef.current = new maplibregl.Marker({ color: "#5B8C3E" })
          .setLngLat([centerLng, centerLat])
          .addTo(map);

        onBboxChange(finalBbox);
      }
    }

    setDrawing(false);
    setStartPoint(null);
  }, [drawing, startPoint, onBboxChange]);

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
