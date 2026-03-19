"use client";

import { getPriceTier } from "@/lib/utils";
import { CreditCard, Download } from "lucide-react";
import { useState } from "react";

interface Props {
  jobId: string;
  areaKm2: number;
}

export function CheckoutSection({ jobId, areaKm2 }: Props) {
  const tier = getPriceTier(areaKm2);
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, area_km2: areaKm2 }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.free_download) {
        // For dev/testing: direct download without payment
        window.location.href = `/create/success?job_id=${jobId}`;
      }
    } catch (e) {
      console.error("Checkout error:", e);
    } finally {
      setLoading(false);
    }
  };

  // In dev mode without Stripe, allow direct download
  const handleFreeDownload = () => {
    window.location.href = `/create/success?job_id=${jobId}`;
  };

  return (
    <div className="max-w-lg mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2 text-center">Download Your World</h1>
      <p className="text-gray-600 mb-8 text-center">
        Complete your purchase to download the generated Minecraft world.
      </p>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
          <div>
            <div className="font-semibold">Minecraft World ({tier.label})</div>
            <div className="text-sm text-gray-500">Area: {areaKm2.toFixed(1)} km\u00B2</div>
          </div>
          <div className="text-2xl font-bold text-[#5B8C3E]">${tier.price}</div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="w-full bg-[#5B8C3E] text-white py-3 rounded-lg font-semibold hover:bg-[#4A7332] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <CreditCard className="h-5 w-5" />
          {loading ? "Redirecting..." : `Pay $${tier.price} with Stripe`}
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-400">or</span>
          </div>
        </div>

        <button
          onClick={handleFreeDownload}
          className="w-full border border-gray-300 text-gray-600 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <Download className="h-5 w-5" />
          Download (Dev Mode)
        </button>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Stripe integration coming soon. Use dev mode for free downloads.
        </p>
      </div>
    </div>
  );
}
