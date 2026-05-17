import { ModularArithmetic } from './modularArithmetic';
import { LatticeKeyGenerator, LatticeParameters } from './latticeWrapper';

interface PayloadMetrics {
  alpha: number;
  noise: number;
  temp: number;
  veracity: number;
}

interface VerifiedOutput {
  alpha: number;
  noise: number;
  temp: number;
}

function runSimulationCheck(payload: any): PayloadMetrics {
  const rawAlpha = payload?.inverion_alpha ?? payload?.alpha ?? 0.5;
  const rawNoise = payload?.boltzmann_noise ?? payload?.noise ?? 0.5;
  const rawTemp = payload?.boltzmann_temperature ?? payload?.temp ?? 0.5;

  const alpha = Math.max(0.001, Math.min(0.999, rawAlpha));
  const noise = Math.max(0.001, Math.min(0.999, rawNoise));
  const temp = Math.max(0.001, Math.min(0.999, rawTemp));

  const entropyBase = Math.abs(alpha - noise);
  const tempInfluence = temp * 0.15;
  const veracity = Math.max(0, Math.min(1, 1 - entropyBase - tempInfluence));

  return { alpha, noise, temp, veracity };
}

export function verifyPayloadVeracity(payload: any): VerifiedOutput {
  const baseMetrics = runSimulationCheck(payload);

  return {
    alpha: baseMetrics.alpha,
    noise: baseMetrics.noise,
    temp: baseMetrics.temp
  };
}

export function computeLatticeHash(data: string): number {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ModularArithmetic.add(hash, char * 31, 0xFFFFFFFF);
  }
  return Math.abs(hash);
}

export class CryptoWrapper {
  private lattice: LatticeKeyGenerator;
  private params: LatticeParameters;

  constructor(n: number = 256, k: number = 4, q: number = 3329) {
    this.lattice = new LatticeKeyGenerator(n, k, q);
    this.params = this.lattice.getParameters();
  }

  getPublicKey(): string {
    const keys = this.lattice.generateKeyPair();
    return JSON.stringify(keys.publicKey);
  }

  processIncomingPayload(payload: any): VerifiedOutput {
    return verifyPayloadVeracity(payload);
  }

  generateProofOfWork(seed: string, difficulty: number = 4): { nonce: number; hash: string } {
    let nonce = 0;
    const target = Math.pow(16, difficulty);
    
    while (true) {
      const input = `${seed}:${nonce}`;
      const hash = computeLatticeHash(input);
      
      if (hash < target) {
        return { nonce, hash: hash.toString(16) };
      }
      nonce++;
      
      if (nonce > 1000000) {
        return { nonce: -1, hash: 'FAILED' };
      }
    }
  }

  verifyStateSignature(state: string): boolean {
    const hash = computeLatticeHash(state);
    return hash > 0;
  }

  getParameters(): string {
    return this.params.toString();
  }
}

export const DEFAULT_CRYPTO_WRAPPER = new CryptoWrapper();