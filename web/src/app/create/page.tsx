"use client";

import { useAppStore } from "@/lib/store";
import { MapSelector } from "@/components/map/MapSelector";
import { GenerationOptions } from "@/components/create/GenerationOptions";
import { GenerationProgress } from "@/components/create/GenerationProgress";
import { WorldPreview } from "@/components/preview/WorldPreview";
import { CheckoutSection } from "@/components/create/CheckoutSection";

export default function CreatePage() {
  const { step, setStep, bbox, setBbox, options, setOptions, jobId, setJobId, areaKm2, setAreaKm2 } = useAppStore();

  const handleStartGeneration = async () => {
    if (!bbox) return;

    setStep("generating");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bbox: [bbox.minLat, bbox.minLng, bbox.maxLat, bbox.maxLng],
          scale: options.scale,
          bedrock: options.bedrock,
          terrain: options.terrain,
          interior: options.interior,
          roof: options.roof,
          fillground: options.fillground,
          spawn_lat: options.spawnLat,
          spawn_lng: options.spawnLng,
        }),
      });

      const data = await res.json();
      if (data.job_id) {
        setJobId(data.job_id);
      }
    } catch (err) {
      console.error("Failed to start generation:", err);
      setStep("options");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {["Select Area", "Options", "Generate", "Preview", "Download"].map((label, i) => {
          const steps: string[] = ["select", "options", "generating", "preview", "checkout"];
          const isActive = steps.indexOf(step) >= i;
          return (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                isActive ? "bg-[#5B8C3E] text-white" : "bg-gray-200 text-gray-500"
              }`}>
                {i + 1}
              </div>
              <span className={`text-sm hidden sm:inline ${isActive ? "text-[#3B3B3B]" : "text-gray-400"}`}>
                {label}
              </span>
              {i < 4 && <div className={`w-8 h-px ${isActive ? "bg-[#5B8C3E]" : "bg-gray-200"}`} />}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      {step === "select" && (
        <div>
          <h1 className="text-2xl font-bold mb-2">Select Your Area</h1>
          <p className="text-gray-600 mb-6">
            Draw a rectangle on the map to select the area you want to convert.
          </p>
          <MapSelector
            onSelect={(bounds, area) => {
              setBbox(bounds);
              setAreaKm2(area);
              setStep("options");
            }}
          />
        </div>
      )}

      {step === "options" && bbox && (
        <GenerationOptions
          bbox={bbox}
          areaKm2={areaKm2}
          options={options}
          onChange={setOptions}
          onBack={() => setStep("select")}
          onGenerate={handleStartGeneration}
        />
      )}

      {step === "generating" && jobId && (
        <GenerationProgress
          jobId={jobId}
          onComplete={() => setStep("preview")}
          onError={() => setStep("options")}
        />
      )}

      {step === "preview" && jobId && (
        <div>
          <h1 className="text-2xl font-bold mb-2">Your World Preview</h1>
          <p className="text-gray-600 mb-6">
            This is a simplified overview of your generated area. Your actual Minecraft
            world will be fully 3D with detailed buildings, roads, interiors, and terrain.
          </p>
          <WorldPreview jobId={jobId} />
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setStep("checkout")}
              className="bg-[#5B8C3E] text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[#4A7332] transition-colors"
            >
              Continue to Download
            </button>
          </div>
        </div>
      )}

      {step === "checkout" && jobId && (
        <CheckoutSection jobId={jobId} areaKm2={areaKm2} />
      )}
    </div>
  );
}
