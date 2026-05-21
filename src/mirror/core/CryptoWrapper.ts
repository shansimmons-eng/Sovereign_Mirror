/**
 * CryptoWrapper - Sole validation interface for incoming telemetry
 * Routes all data pipelines through zero-cost local simulation
 * No external crypto dependencies - frozen for UI compilation
 */

export interface VerifiedOutput {
  alpha: number;
  noise: number;
  temp: number;
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
}

function runSimulationCheck(payload: TelemetryPayload): { alpha: number; noise: number; temp: number } {
  const rawAlpha = payload?.inverion_alpha ?? payload?.alpha ?? 0.75;
  const rawNoise = payload?.boltzmann_noise ?? payload?.noise ?? 0.15;
  const rawTemp = payload?.boltzmann_temperature ?? payload?.temp ?? 0.45;

  const alpha = Math.max(0.001, Math.min(0.999, rawAlpha));
  const noise = Math.max(0.001, Math.min(0.999, rawNoise));
  const temp = Math.max(0.001, Math.min(0.999, rawTemp));

  return { alpha, noise, temp };
}

export function verifyPayloadVeracity(payload: TelemetryPayload): VerifiedOutput {
  const baseMetrics = runSimulationCheck(payload);

  return {
    alpha: baseMetrics.alpha,
    noise: baseMetrics.noise,
    temp: baseMetrics.temp
  };
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

  processPayloadToUniforms(payload: any): {
    alpha: number;
    noise: number;
    temp: number;
    fissionStretch: number;
    orbitalVelocity: number;
  } {
    const verified = verifyPayloadVeracity(payload);

    return {
      alpha: verified.alpha,
      noise: verified.noise,
      temp: verified.temp,
      fissionStretch: computeFissionStretch(verified.noise, verified.temp),
      orbitalVelocity: calculateOrbitalVelocity(verified.temp, verified.alpha)
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

export const CORE_GATEWAY = new CoreCryptoGateway();