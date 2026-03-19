"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { BBox } from "@/lib/store";

interface Props {
  bbox: BBox;
}

export default function MiniMap({ bbox }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

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

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [bbox]);

  return <div ref={containerRef} className="w-full h-48 rounded-lg" />;
}
