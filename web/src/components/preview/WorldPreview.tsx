"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Loader2 } from "lucide-react";

interface PreviewData {
  width: number;
  height: number;
  heightmap: number[];
  colormap: number[][];
  min_y: number;
  max_y: number;
}

interface Props {
  jobId: string;
}

function TerrainMesh({ data }: { data: PreviewData }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const { width, height, heightmap, colormap, min_y, max_y } = data;
    const geo = new THREE.PlaneGeometry(width, height, width - 1, height - 1);

    // Rotate to horizontal
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    const yRange = max_y - min_y || 1;
    const heightScale = Math.min(width, height) * 0.15;

    for (let i = 0; i < positions.count; i++) {
      // Set Y (height)
      const h = heightmap[i] || 0;
      const normalizedH = (h - min_y) / yRange;
      positions.setY(i, normalizedH * heightScale);

      // Set vertex color
      const color = colormap[i] || [160, 160, 160];
      colors[i * 3] = color[0] / 255;
      colors[i * 3 + 1] = color[1] / 255;
      colors[i * 3 + 2] = color[2] / 255;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    return geo;
  }, [data]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshLambertMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}

export function WorldPreview({ jobId }: Props) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewPreset, setViewPreset] = useState<"perspective" | "top" | "side">("perspective");

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/preview/${jobId}`);
        if (!res.ok) throw new Error("Failed to load preview");
        const data = await res.json();
        setPreviewData(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load preview");
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-xl">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-[#5B8C3E] animate-spin mx-auto mb-2" />
          <p className="text-gray-500">Loading 3D preview...</p>
        </div>
      </div>
    );
  }

  if (error || !previewData) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-xl">
        <p className="text-gray-500">{error || "No preview available"}</p>
      </div>
    );
  }

  const cameraPositions = {
    perspective: [previewData.width * 0.6, previewData.width * 0.4, previewData.height * 0.6] as [number, number, number],
    top: [0, previewData.width * 0.8, 0] as [number, number, number],
    side: [previewData.width * 0.8, previewData.width * 0.1, 0] as [number, number, number],
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(["perspective", "top", "side"] as const).map((preset) => (
          <button
            key={preset}
            onClick={() => setViewPreset(preset)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewPreset === preset
                ? "bg-[#5B8C3E] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {preset.charAt(0).toUpperCase() + preset.slice(1)}
          </button>
        ))}
      </div>
      <div className="h-[500px] bg-gradient-to-b from-[#87CEEB] to-[#B8D4E3] rounded-xl overflow-hidden border border-gray-200">
        <Canvas camera={{ position: cameraPositions[viewPreset], fov: 50 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[100, 100, 50]} intensity={0.8} />
          <TerrainMesh data={previewData} />
          <OrbitControls
            enablePan
            enableZoom
            enableRotate
            autoRotate
            autoRotateSpeed={1}
          />
        </Canvas>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Click and drag to rotate. Scroll to zoom. Right-click to pan.
      </p>
      <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3 text-center">
        This preview shows a simplified terrain overview. Your downloaded world includes
        full-detail buildings, block-level roads, trees, and more.
      </p>
    </div>
  );
}
