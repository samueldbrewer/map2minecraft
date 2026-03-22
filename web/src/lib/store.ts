import { create } from 'zustand'

export interface BBox {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}

export interface GenerationOptions {
  bedrock: boolean
  scale: number
  terrain: boolean
  interior: boolean
  roof: boolean
  fillground: boolean
  cityBoundaries: boolean
  timeout: number
  spawnLat?: number
  spawnLng?: number
}

export type AppStep = 'select' | 'options' | 'generating' | 'preview' | 'checkout' | 'success'

interface AppState {
  step: AppStep
  setStep: (step: AppStep) => void
  bbox: BBox | null
  setBbox: (bbox: BBox | null) => void
  options: GenerationOptions
  setOptions: (options: Partial<GenerationOptions>) => void
  jobId: string | null
  setJobId: (id: string | null) => void
  progress: number
  setProgress: (p: number) => void
  progressMessage: string
  setProgressMessage: (m: string) => void
  areaKm2: number
  setAreaKm2: (a: number) => void
  reset: () => void
}

const defaultOptions: GenerationOptions = {
  bedrock: false,
  scale: 1.0,
  terrain: true,
  interior: true,
  roof: true,
  fillground: false,
  cityBoundaries: true,
  timeout: 60,
}

export const useAppStore = create<AppState>((set) => ({
  step: 'select',
  setStep: (step) => set({ step }),
  bbox: null,
  setBbox: (bbox) => set({ bbox }),
  options: defaultOptions,
  setOptions: (opts) => set((state) => ({ options: { ...state.options, ...opts } })),
  jobId: null,
  setJobId: (jobId) => set({ jobId }),
  progress: 0,
  setProgress: (progress) => set({ progress }),
  progressMessage: '',
  setProgressMessage: (progressMessage) => set({ progressMessage }),
  areaKm2: 0,
  setAreaKm2: (areaKm2) => set({ areaKm2 }),
  reset: () => set({
    step: 'select',
    bbox: null,
    options: defaultOptions,
    jobId: null,
    progress: 0,
    progressMessage: '',
    areaKm2: 0,
  }),
}))
