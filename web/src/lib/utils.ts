import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatArea(km2: number): string {
  if (km2 < 1) return `${(km2 * 1000000).toFixed(0)} m²`
  return `${km2.toFixed(1)} km²`
}

export function getPriceTier(km2: number): { label: string; price: number } {
  if (km2 < 1) return { label: "Small", price: 2 }
  if (km2 < 5) return { label: "Medium", price: 5 }
  if (km2 < 25) return { label: "Large", price: 10 }
  return { label: "XL", price: 15 }
}
