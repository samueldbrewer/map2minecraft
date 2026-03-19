"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Search, RotateCcw } from "lucide-react";
import type { BBox } from "@/lib/store";
import { formatArea } from "@/lib/utils";

interface Props {
  onSelect: (bbox: BBox, areaKm2: number) => void;
}

function calcArea(bounds: BBox): number {
  const R = 6371;
  const lat1 = (bounds.minLat * Math.PI) / 180;
  const lat2 = (bounds.maxLat * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((bounds.maxLng - bounds.minLng) * Math.PI) / 180;
  const width = R * dLng * Math.cos((lat1 + lat2) / 2);
  const height = R * dLat;
  return Math.abs(width * height);
}

export function MapSelector({ onSelect }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ lng: number; lat: number } | null>(null);
  const [currentBbox, setCurrentBbox] = useState<BBox | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string; boundingbox: string[] }>>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    import("maplibre-gl").then((maplibregl) => {
      const map = new maplibregl.default.Map({
        container: mapContainer.current!,
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

      map.addControl(new maplibregl.default.NavigationControl(), "top-right");

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
          paint: {
            "fill-color": "#5B8C3E",
            "fill-opacity": 0.15,
          },
        });
        map.addLayer({
          id: "selection-border",
          type: "line",
          source: "selection",
          paint: {
            "line-color": "#5B8C3E",
            "line-width": 2,
          },
        });
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const updateSelectionRect = useCallback((bbox: BBox) => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource("selection") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
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
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Disable map dragging while drawing
    map.dragPan.disable();

    const rect = mapContainer.current!.getBoundingClientRect();
    const point = map.unproject([e.clientX - rect.left, e.clientY - rect.top]);
    setStartPoint({ lng: point.lng, lat: point.lat });
    setDrawing(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing || !startPoint || !mapRef.current) return;
    const map = mapRef.current;
    const rect = mapContainer.current!.getBoundingClientRect();
    const point = map.unproject([e.clientX - rect.left, e.clientY - rect.top]);

    const bbox: BBox = {
      minLat: Math.min(startPoint.lat, point.lat),
      minLng: Math.min(startPoint.lng, point.lng),
      maxLat: Math.max(startPoint.lat, point.lat),
      maxLng: Math.max(startPoint.lng, point.lng),
    };

    setCurrentBbox(bbox);
    updateSelectionRect(bbox);
  }, [drawing, startPoint, updateSelectionRect]);

  const handleMouseUp = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.dragPan.enable();
    setDrawing(false);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      setSearchResults(data);
      setShowResults(true);

      if (data.length > 0 && mapRef.current) {
        const { lat, lon } = data[0];
        mapRef.current.flyTo({ center: [parseFloat(lon), parseFloat(lat)], zoom: 14 });
      }
    } catch (e) {
      console.error("Search failed:", e);
    }
  };

  const handleSearchSelect = (result: typeof searchResults[0]) => {
    if (!mapRef.current) return;
    const bb = result.boundingbox;
    const bbox: BBox = {
      minLat: parseFloat(bb[0]),
      maxLat: parseFloat(bb[1]),
      minLng: parseFloat(bb[2]),
      maxLng: parseFloat(bb[3]),
    };
    setCurrentBbox(bbox);
    updateSelectionRect(bbox);
    mapRef.current.fitBounds(
      [[bbox.minLng, bbox.minLat], [bbox.maxLng, bbox.maxLat]],
      { padding: 50 }
    );
    setShowResults(false);
  };

  const handleReset = () => {
    setCurrentBbox(null);
    const map = mapRef.current;
    if (map) {
      const source = map.getSource("selection") as maplibregl.GeoJSONSource | undefined;
      source?.setData({ type: "FeatureCollection", features: [] });
    }
  };

  const area = currentBbox ? calcArea(currentBbox) : 0;

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search for a city, landmark, or address..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#5B8C3E] focus:ring-1 focus:ring-[#5B8C3E] outline-none"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <button onClick={handleSearch} className="px-4 py-2.5 bg-[#5B8C3E] text-white rounded-lg hover:bg-[#4A7332] transition-colors text-sm font-medium">
            Search
          </button>
        </div>
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSearchSelect(r)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <div
          ref={mapContainer}
          className="h-[500px] cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Map overlay info */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm shadow-sm">
          {currentBbox ? (
            <span>Selected: <strong>{formatArea(area)}</strong></span>
          ) : (
            <span className="text-gray-500">Click and drag to select an area</span>
          )}
        </div>

        {currentBbox && (
          <button
            onClick={handleReset}
            className="absolute top-4 right-16 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-sm hover:bg-white transition-colors"
            title="Reset selection"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Confirm */}
      {currentBbox && area > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Area: <strong>{formatArea(area)}</strong>
            {area > 100 && (
              <span className="text-red-500 ml-2">Area too large (max 100 km\u00B2)</span>
            )}
          </div>
          <button
            onClick={() => onSelect(currentBbox, area)}
            disabled={area > 100}
            className="bg-[#5B8C3E] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#4A7332] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue with Selection
          </button>
        </div>
      )}
    </div>
  );
}
