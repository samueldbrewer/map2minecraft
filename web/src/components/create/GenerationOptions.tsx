"use client";

import type { BBox, GenerationOptions as GenOpts } from "@/lib/store";
import { formatArea, getPriceTier } from "@/lib/utils";
import MiniMap from "@/components/map/MiniMap";

interface Props {
  bbox: BBox;
  areaKm2: number;
  options: GenOpts;
  onChange: (opts: Partial<GenOpts>) => void;
  onBack: () => void;
  onGenerate: () => void;
}

const RECOMMENDED: Partial<GenOpts> = {
  bedrock: false,
  scale: 1.0,
  terrain: true,
  interior: true,
  roof: true,
  fillground: false,
  cityBoundaries: true,
  timeout: 60,
};

function isRecommended(options: GenOpts): boolean {
  return (
    options.scale === RECOMMENDED.scale &&
    options.terrain === RECOMMENDED.terrain &&
    options.interior === RECOMMENDED.interior &&
    options.roof === RECOMMENDED.roof &&
    options.fillground === RECOMMENDED.fillground &&
    options.cityBoundaries === RECOMMENDED.cityBoundaries &&
    options.timeout === RECOMMENDED.timeout
  );
}

export function GenerationOptions({ bbox, areaKm2, options, onChange, onBack, onGenerate }: Props) {
  const tier = getPriceTier(areaKm2);
  const recommended = isRecommended(options);

  const resetToRecommended = () => onChange(RECOMMENDED);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Generation Options</h1>
      <p className="text-gray-600 mb-6">
        Customize how your Minecraft world will be generated.
      </p>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
        {/* Area info with mini map */}
        <div className="bg-[#F5F5F0] rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-gray-500">Selected Area</div>
              <div className="font-semibold">{formatArea(areaKm2)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">{tier.label}</div>
              <div className="font-bold text-[#5B8C3E] text-xl">${tier.price}</div>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <MiniMap bbox={bbox} />
          </div>
          <div className="text-xs text-gray-400">
            {bbox.minLat.toFixed(4)}, {bbox.minLng.toFixed(4)} &rarr; {bbox.maxLat.toFixed(4)}, {bbox.maxLng.toFixed(4)}
          </div>
        </div>

        {/* Recommended settings banner */}
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border ${
          recommended
            ? "bg-[#5B8C3E]/5 border-[#5B8C3E]/30 text-[#3B6B2A]"
            : "bg-amber-50 border-amber-200 text-amber-800"
        }`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            {recommended ? (
              <>
                <span className="text-base">✓</span>
                Recommended settings — optimized for best output quality
              </>
            ) : (
              <>
                <span className="text-base">⚠</span>
                Settings modified from recommended
              </>
            )}
          </div>
          {!recommended && (
            <button
              onClick={resetToRecommended}
              className="text-xs font-medium text-amber-700 underline underline-offset-2 whitespace-nowrap"
            >
              Reset to recommended
            </button>
          )}
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-medium mb-2">World Format</label>
          <div className="flex gap-3">
            <button
              onClick={() => onChange({ bedrock: false })}
              className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                !options.bedrock ? "border-[#5B8C3E] bg-[#5B8C3E]/5 text-[#5B8C3E]" : "border-gray-200 text-gray-500"
              }`}
            >
              Java Edition
            </button>
            <button
              onClick={() => onChange({ bedrock: true })}
              className={`flex-1 py-2.5 px-4 rounded-lg border-2 text-sm font-medium transition-colors ${
                options.bedrock ? "border-[#5B8C3E] bg-[#5B8C3E]/5 text-[#5B8C3E]" : "border-gray-200 text-gray-500"
              }`}
            >
              Bedrock Edition
            </button>
          </div>
        </div>

        {/* Scale */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              Scale: {options.scale}x <span className="text-gray-400 font-normal">({options.scale} block{options.scale !== 1 ? 's' : ''} per meter)</span>
            </label>
            {options.scale === RECOMMENDED.scale && (
              <span className="text-xs text-[#5B8C3E] font-medium">recommended</span>
            )}
          </div>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={options.scale}
            onChange={(e) => onChange({ scale: parseFloat(e.target.value) })}
            className="w-full accent-[#5B8C3E]"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0.5x — compact</span>
            <span>1.0x — true scale</span>
            <span>3.0x — overview</span>
          </div>
        </div>

        {/* Feature toggles */}
        <div>
          <div className="text-sm font-medium mb-3">Features</div>
          <div className="space-y-2">
            {([
              {
                key: "terrain" as const,
                label: "3D Terrain",
                desc: "Real-world elevation data for hills and valleys",
                recommended: true,
              },
              {
                key: "interior" as const,
                label: "Building Interiors",
                desc: "Generate floors and rooms inside buildings",
                recommended: true,
              },
              {
                key: "roof" as const,
                label: "Roofs",
                desc: "Procedural gabled, hipped, and dome roofs on buildings",
                recommended: true,
              },
              {
                key: "cityBoundaries" as const,
                label: "Smart Ground Detection",
                desc: "Auto-detects urban clusters and applies stone ground; grass elsewhere",
                recommended: true,
              },
              {
                key: "fillground" as const,
                label: "Fill All Ground",
                desc: "Fills every surface with solid blocks, including forests and fields — use only for flat urban areas",
                recommended: false,
              },
            ] as const).map((toggle) => (
              <label
                key={toggle.key}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-100 transition-colors"
              >
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{toggle.label}</span>
                    {options[toggle.key] === toggle.recommended && (
                      <span className="text-xs text-[#5B8C3E] font-medium">recommended</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{toggle.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={options[toggle.key]}
                  onChange={(e) => onChange({ [toggle.key]: e.target.checked })}
                  className="w-5 h-5 rounded accent-[#5B8C3E] flex-shrink-0"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Advanced */}
        <div>
          <div className="text-sm font-medium mb-3">Advanced</div>
          <div className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Floodfill Timeout</span>
                  {options.timeout === RECOMMENDED.timeout && (
                    <span className="text-xs text-[#5B8C3E] font-medium">recommended</span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Max seconds for area-fill operations (roads, parks, water). Increase for complex areas.
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="number"
                  min={10}
                  max={300}
                  step={10}
                  value={options.timeout}
                  onChange={(e) => onChange({ timeout: Math.max(10, parseInt(e.target.value) || 60) })}
                  className="w-20 text-sm text-center border border-gray-300 rounded-lg px-2 py-1.5 focus:border-[#5B8C3E] focus:ring-1 focus:ring-[#5B8C3E] outline-none"
                />
                <span className="text-xs text-gray-500">sec</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onGenerate}
          className="bg-[#5B8C3E] text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-[#4A7332] transition-colors"
        >
          Generate World
        </button>
      </div>
    </div>
  );
}
