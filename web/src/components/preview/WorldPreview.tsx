"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface Props {
  jobId: string;
}

type PreviewState = "loading" | "ready" | "unavailable";

export function WorldPreview({ jobId }: Props) {
  const [state, setState] = useState<PreviewState>("loading");
  const [isBedrock, setIsBedrock] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/status/${jobId}`);
        // status endpoint returns SSE — use preview endpoint to check readiness
      } catch {
        // ignore
      }

      // Poll the preview endpoint until bluemap_ready or fallback
      const check = async () => {
        try {
          const res = await fetch(`/api/bluemap/${jobId}`);
          if (res.ok) {
            if (!cancelled) setState("ready");
            return true;
          }
          if (res.status === 404) {
            // Check if bedrock world (no BlueMap support)
            const previewRes = await fetch(`/api/preview/${jobId}`);
            if (previewRes.ok) {
              const data = await previewRes.json();
              if (data?.status === "completed" || data?.world_path) {
                if (!cancelled) setState("unavailable");
                return true;
              }
            }
          }
        } catch {
          // ignore, retry
        }
        return false;
      };

      let attempts = 0;
      const timer = setInterval(async () => {
        attempts++;
        const done = await check();
        if (done || cancelled || attempts > 60) {
          clearInterval(timer);
          if (!done && !cancelled) setState("unavailable");
        }
      }, 3000);

      // Cleanup on unmount
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    };

    const cleanup = poll();
    return () => {
      cancelled = true;
      cleanup.then((fn) => fn?.());
    };
  }, [jobId]);

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] bg-gray-100 rounded-xl gap-4">
        <Loader2 className="h-8 w-8 text-[#5B8C3E] animate-spin" />
        <p className="text-gray-600 font-medium">Rendering interactive map preview…</p>
        <p className="text-sm text-gray-400">This may take a minute for larger areas.</p>
      </div>
    );
  }

  if (state === "unavailable") {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] bg-gray-100 rounded-xl gap-3">
        <p className="text-gray-500 font-medium">Interactive preview not available</p>
        <p className="text-sm text-gray-400">
          {isBedrock
            ? "BlueMap preview is only available for Java Edition worlds."
            : "The preview could not be rendered. Your world file is still ready to download."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <iframe
          src={`/api/bluemap/${jobId}`}
          className="w-full h-[600px] border-0"
          title="BlueMap World Preview"
          allow="fullscreen"
        />
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Click and drag to rotate · Scroll to zoom · Right-click to pan
      </p>
      <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3 text-center">
        This preview shows an overview render. Your downloaded world includes
        full-detail buildings, block-level roads, trees, and more.
      </p>
    </div>
  );
}
