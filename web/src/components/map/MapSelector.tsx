"use client";

import { useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import type { BBox } from "@/lib/store";
import { formatArea } from "@/lib/utils";
import MapInner from "./MapInner";

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
  const [currentBbox, setCurrentBbox] = useState<BBox | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string; boundingbox: string[] }>>([]);
  const [showResults, setShowResults] = useState(false);

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
    } catch (e) {
      console.error("Search failed:", e);
    }
  };

  const handleSearchSelect = (result: typeof searchResults[0]) => {
    const bb = result.boundingbox;
    const bbox: BBox = {
      minLat: parseFloat(bb[0]),
      maxLat: parseFloat(bb[1]),
      minLng: parseFloat(bb[2]),
      maxLng: parseFloat(bb[3]),
    };
    setCurrentBbox(bbox);
    setShowResults(false);
  };

  const handleReset = () => {
    setCurrentBbox(null);
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
        <MapInner
          bbox={currentBbox}
          onBboxChange={setCurrentBbox}
        />

        {/* Map overlay info */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm shadow-sm z-10">
          {currentBbox ? (
            <span>Selected: <strong>{formatArea(area)}</strong></span>
          ) : (
            <span className="text-gray-500">Click and drag to select an area</span>
          )}
        </div>

        {currentBbox && (
          <button
            onClick={handleReset}
            className="absolute top-4 right-16 bg-white/90 backdrop-blur-sm rounded-lg p-2 shadow-sm hover:bg-white transition-colors z-10"
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
              <span className="text-red-500 ml-2">Area too large (max 100 km²)</span>
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
