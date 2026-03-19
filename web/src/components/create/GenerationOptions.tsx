"use client";

import type { BBox, GenerationOptions as GenOpts } from "@/lib/store";
import { formatArea, getPriceTier } from "@/lib/utils";

interface Props {
  bbox: BBox;
  areaKm2: number;
  options: GenOpts;
  onChange: (opts: Partial<GenOpts>) => void;
  onBack: () => void;
  onGenerate: () => void;
}

export function GenerationOptions({ bbox, areaKm2, options, onChange, onBack, onGenerate }: Props) {
  const tier = getPriceTier(areaKm2);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Generation Options</h1>
      <p className="text-gray-600 mb-6">
        Customize how your Minecraft world will be generated.
      </p>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-6">
        {/* Area info */}
        <div className="bg-[#F5F5F0] rounded-lg p-4">
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
          <div className="text-xs text-gray-400 mt-2">
            {bbox.minLat.toFixed(4)}, {bbox.minLng.toFixed(4)} &rarr; {bbox.maxLat.toFixed(4)}, {bbox.maxLng.toFixed(4)}
          </div>
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
          <label className="block text-sm font-medium mb-2">
            Scale: {options.scale}x <span className="text-gray-400 font-normal">({options.scale} block{options.scale !== 1 ? 's' : ''} per meter)</span>
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={options.scale}
            onChange={(e) => onChange({ scale: parseFloat(e.target.value) })}
            className="w-full accent-[#5B8C3E]"
          />
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          {[
            { key: "terrain" as const, label: "Terrain Elevation", desc: "Real elevation data from terrain APIs" },
            { key: "interior" as const, label: "Building Interiors", desc: "Generate floors and rooms inside buildings" },
            { key: "roof" as const, label: "Roofs", desc: "Generate roofs on buildings" },
            { key: "fillground" as const, label: "Fill Ground", desc: "Fill underground with stone (larger file size)" },
          ].map((toggle) => (
            <label key={toggle.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
              <div>
                <div className="text-sm font-medium">{toggle.label}</div>
                <div className="text-xs text-gray-400">{toggle.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={options[toggle.key]}
                onChange={(e) => onChange({ [toggle.key]: e.target.checked })}
                className="w-5 h-5 rounded accent-[#5B8C3E]"
              />
            </label>
          ))}
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
