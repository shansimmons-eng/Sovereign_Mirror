import { create } from 'zustand';
import { GOLDEN_RATIO } from '../../logic/types';

interface HUDState {
  temperature: number;
  noiseFilter: number;
  sunriseOpacity: number;
  effectiveTickRate: number;
  globalStabilityScore: number;
  lowestNodeResonance: number;
  setTemperature: (t: number) => void;
  setNoiseFilter: (n: number) => void;
  updateSunriseOpacity: () => void;
  updateTickRate: () => void;
  updateGlobalStability: (nodes: Array<{ resonanceScore: number }>) => void;
}

const BASE_TICK_RATE = 400;
const PHI = 1.618033988749895;

export const useHUDStore = create<HUDState>((set, get) => ({
  temperature: 0.5,
  noiseFilter: 0.3,
  sunriseOpacity: 0.3,
  effectiveTickRate: BASE_TICK_RATE,
  globalStabilityScore: 0,
  lowestNodeResonance: 0,
  setTemperature: (t) => {
    set({ temperature: t });
    get().updateSunriseOpacity();
    get().updateTickRate();
  },
  setNoiseFilter: (n) => {
    set({ noiseFilter: n });
    get().updateTickRate();
  },
  updateSunriseOpacity: () => {
    const { temperature } = get();
    set({ sunriseOpacity: temperature * GOLDEN_RATIO });
  },
  updateTickRate: () => {
    const { noiseFilter } = get();
    const modulatedRate = BASE_TICK_RATE * Math.exp(noiseFilter * Math.log(PHI));
    set({ effectiveTickRate: modulatedRate });
  },
  updateGlobalStability: (nodes) => {
    if (nodes.length === 0) {
      set({ globalStabilityScore: 0, lowestNodeResonance: 0 });
      return;
    }

    const resonanceValues = nodes.map(n => n.resonanceScore);
    const lowest = Math.min(...resonanceValues);
    const avg = resonanceValues.reduce((a, b) => a + b, 0) / resonanceValues.length;
    const variance = resonanceValues.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / resonanceValues.length;
    const stability = Math.max(0, 1 - Math.sqrt(variance));

    set({
      globalStabilityScore: stability,
      lowestNodeResonance: lowest,
    });
  },
}));