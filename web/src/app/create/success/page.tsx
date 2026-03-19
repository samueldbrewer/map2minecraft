"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Download, ArrowLeft, BookOpen } from "lucide-react";

function SuccessContent() {
  const params = useSearchParams();
  const jobId = params.get("job_id");

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 bg-[#5B8C3E]/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <Download className="h-8 w-8 text-[#5B8C3E]" />
      </div>
      <h1 className="text-3xl font-bold mb-4">Your World is Ready!</h1>
      <p className="text-gray-600 mb-8">
        Your Minecraft world has been generated and is ready for download.
      </p>

      {jobId && (
        <a
          href={`/api/download/${jobId}`}
          className="inline-flex items-center gap-2 bg-[#5B8C3E] text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-[#4A7332] transition-colors mb-8"
        >
          <Download className="h-5 w-5" />
          Download World
        </a>
      )}

      <div className="bg-white rounded-xl p-6 text-left mt-8 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#5B8C3E]" />
          How to Import
        </h2>
        <div className="space-y-4 text-sm text-gray-600">
          <div>
            <h3 className="font-medium text-[#3B3B3B]">Java Edition</h3>
            <ol className="list-decimal list-inside space-y-1 mt-1">
              <li>Extract the downloaded zip file</li>
              <li>Copy the world folder to your <code className="bg-gray-100 px-1 rounded">.minecraft/saves/</code> directory</li>
              <li>Launch Minecraft and select the world from Singleplayer</li>
            </ol>
          </div>
          <div>
            <h3 className="font-medium text-[#3B3B3B]">Bedrock Edition</h3>
            <ol className="list-decimal list-inside space-y-1 mt-1">
              <li>Extract the downloaded zip file</li>
              <li>Double-click the .mcworld file to import automatically</li>
              <li>Or copy to <code className="bg-gray-100 px-1 rounded">games/com.mojang/minecraftWorlds/</code></li>
            </ol>
          </div>
        </div>
      </div>

      <Link
        href="/create"
        className="inline-flex items-center gap-2 text-[#5B8C3E] mt-8 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Create Another World
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="text-center py-16">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
