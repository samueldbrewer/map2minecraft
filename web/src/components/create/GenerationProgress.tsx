"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { Loader2 } from "lucide-react";

interface Props {
  jobId: string;
  onComplete: () => void;
  onError: () => void;
}

export function GenerationProgress({ jobId, onComplete, onError }: Props) {
  const { progress, setProgress, progressMessage, setProgressMessage } = useAppStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/status/${jobId}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress !== undefined) setProgress(data.progress);
        if (data.message) setProgressMessage(data.message);

        if (data.status === "completed") {
          es.close();
          onComplete();
        } else if (data.status === "failed") {
          es.close();
          setProgressMessage(data.error || "Generation failed");
          setTimeout(onError, 2000);
        }
      } catch (e) {
        console.error("SSE parse error:", e);
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [jobId, onComplete, onError, setProgress, setProgressMessage]);

  return (
    <div className="max-w-lg mx-auto text-center py-12">
      <Loader2 className="h-12 w-12 text-[#5B8C3E] animate-spin mx-auto mb-6" />
      <h1 className="text-2xl font-bold mb-2">Generating Your World</h1>
      <p className="text-gray-600 mb-8">{progressMessage || "Starting generation..."}</p>

      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
        <div
          className="bg-[#5B8C3E] h-3 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="text-sm text-gray-500">{Math.round(progress)}%</div>
    </div>
  );
}
