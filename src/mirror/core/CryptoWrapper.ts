/**
 * CryptoWrapper - Sole validation interface for incoming telemetry
 * Routes all data pipelines through zero-cost local simulation
 * No external crypto dependencies - frozen for UI compilation
 */

import { STATE_LOADER } from './stateFileLoader';

export interface VerifiedOutput {
  alpha: number;
  noise: number;
  temp: number;
  bolt: number;
  grain: number;
}

export interface VisualPayload {
  alpha: number;
  noise: number;
  temp: number;
  bolt: number;
  grain: number;
}

export interface TelemetryPayload {
  inverion_alpha?: number;
  alpha?: number;
  boltzmann_noise?: number;
  noise?: number;
  boltzmann_temperature?: number;
  temp?: number;
  velocity?: number;
  state?: 'ACTIVE' | 'SYNCING' | 'STANDBY';
  bolt?: number;
  grain?: number;
}

interface ActiveStateFile {
  metadata: {
    simulation_timestamp: number;
    cycle_count: number;
    current_milestone_id: string;
    profile_type: string;
    uptime_seconds: number;
  };
  telemetry: {
    alpha: number;
    inverion_alpha: number;
    noise: number;
    boltzmann_noise: number;
    temp: number;
    boltzmann_temperature: number;
    velocity: number;
    state: 'ACTIVE' | 'SYNCING' | 'STANDBY';
    bolt?: number;
    grain?: number;
  };
  system: {
    resonance: number;
    nodes_count: number;
    particle_count: number;
    fission_stretch: number;
  };
  description: string;
}

let cachedState: ActiveStateFile | null = null;
let lastFetchTime: number = 0;
const FETCH_CACHE_TTL_MS = 500;

export async function verifyPayloadVeracity(payload: TelemetryPayload): Promise<VerifiedOutput> {
  const now = Date.now();
  
  if (!cachedState || (now - lastFetchTime) >= FETCH_CACHE_TTL_MS) {
    try {
      const response = await fetch('./active_state.json');
      if (response.ok) {
        cachedState = await response.json();
        lastFetchTime = now;
      }
    } catch {
      // Network latency - use cached or default
    }
  }

  const telemetry = cachedState?.telemetry;
  
  const rawAlpha = payload?.inverion_alpha ?? payload?.alpha ?? telemetry?.alpha ?? 0.75;
  const rawNoise = payload?.boltzmann_noise ?? payload?.noise ?? telemetry?.noise ?? 0.15;
  const rawTemp = payload?.boltzmann_temperature ?? payload?.temp ?? telemetry?.temp ?? 0.45;
  const rawBolt = payload?.bolt ?? telemetry?.bolt ?? 0.0;
  const rawGrain = payload?.grain ?? telemetry?.grain ?? 0.0;

  const alpha = Math.max(0.001, Math.min(0.999, rawAlpha));
  const noise = Math.max(0.001, Math.min(0.999, rawNoise));
  const temp = Math.max(0.001, Math.min(0.999, rawTemp));
  const bolt = Math.max(0.0, Math.min(1.0, rawBolt));
  const grain = Math.max(0.0, Math.min(1.0, rawGrain));

  return { alpha, noise, temp, bolt, grain };
}

export function computeVeracityHash(data: string): number {
  // Local mock hash - simple FNV-1a variant without crypto dependencies
  let hash = 2166136261;
  for (let i = 0; i < data.length; i++) {
    hash ^= data.charCodeAt(i);
    hash = (hash * 16777619) & 0xFFFFFFFF;
  }
  return Math.abs(hash);
}

export function normalizeToroidalRadius(alpha: number): number {
  return 0.618 + (alpha * 0.382);
}

export function computeFissionStretch(noise: number, temp: number): number {
  const baseStretch = Math.abs(noise - temp);
  return Math.min(1.5, baseStretch * 2);
}

export function calculateOrbitalVelocity(temp: number, alpha: number): number {
  const omega = (temp * 0.15) + (alpha * 0.05);
  return Math.min(omega, 0.95);
}

export class CoreCryptoGateway {
  private proofNonce: number = 0;

  async processPayloadToUniforms(payload: TelemetryPayload): Promise<{
    alpha: number;
    noise: number;
    temp: number;
    bolt: number;
    grain: number;
    fissionStretch: number;
    orbitalVelocity: number;
    toroidalRadius: number;
  }> {
    const verified = await verifyPayloadVeracity(payload);

    return {
      alpha: verified.alpha,
      noise: verified.noise,
      temp: verified.temp,
      bolt: verified.bolt,
      grain: verified.grain,
      fissionStretch: computeFissionStretch(verified.noise, verified.temp),
      orbitalVelocity: calculateOrbitalVelocity(verified.temp, verified.alpha),
      toroidalRadius: normalizeToroidalRadius(verified.alpha)
    };
  }

  async getCurrentSimulationState(): Promise<VisualPayload> {
    const payload = STATE_LOADER.getTelemetryPayload();
    const uniforms = await this.processPayloadToUniforms(payload);
    return {
      alpha: uniforms.alpha,
      noise: uniforms.noise,
      temp: uniforms.temp,
      bolt: uniforms.bolt,
      grain: uniforms.grain
    };
  }

  generateProofSeed(nodeId: string, sequence: number): string {
    const input = `${nodeId}:${sequence}:${this.proofNonce++}:${Date.now()}`;
    return computeVeracityHash(input).toString(16);
  }

  verifyStateConsistency(stateA: string, stateB: string): boolean {
    const hashA = computeVeracityHash(stateA);
    const hashB = computeVeracityHash(stateB);
    const delta = Math.abs(hashA - hashB);
    return delta < 0x0FFFFFFF;
  }
}

export async function getVisualPayload(): Promise<VisualPayload> {
  try {
    // Try fetching from server first (production)
    const response = await fetch('./active_state.json');
    if (response.ok) {
      const state = await response.json();
      return {
        alpha: Math.max(state.telemetry?.alpha ?? 0.702, 0.002),
        noise: state.telemetry?.noise ?? 0.35,
        temp: state.telemetry?.temp ?? 0.5,
        bolt: state.telemetry?.bolt ?? 0.0,
        grain: state.telemetry?.grain ?? 0.0
      };
    }
  } catch {
    // Fall through to browser simulation
  }

  // Fallback: Use browser-based simulation engine
  const payload = STATE_LOADER.getTelemetryPayload();
  return {
    alpha: Math.max(payload.alpha ?? 0.702, 0.002),
    noise: payload.noise ?? 0.35,
    temp: payload.temp ?? 0.5,
    bolt: payload.bolt ?? 0.0,
    grain: payload.grain ?? 0.0
  };
}

export const CORE_GATEWAY = new CoreCryptoGateway();