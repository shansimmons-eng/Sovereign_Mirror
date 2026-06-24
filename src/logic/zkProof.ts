import { cryptoSign, cryptoVerify, cryptoKeypair, CryptoKeypairResult } from '../services/apiService';
import { store } from '../state/ledger/store';
import { triggerPhysicalization } from '../state/ledger/slices/physicalizationSlice';

export interface ZKProof {
  proofId: string;
  nodeId: string;
  algorithm: string;
  signature: string;
  publicKey: string;
  message: string;
  verificationResult: boolean;
  timestamp: number;
}

export interface VeracityClaim {
  nodeId: string;
  claimedVeracity: number;
  claimedVelocity: number;
  message?: string;
}

export interface VerificationResult {
  valid: boolean;
  proofId: string;
  error?: string;
}

let keypairCache: Record<string, CryptoKeypairResult> = {};

export class QPADLProofEngine {
  private algorithm: string;

  constructor(algorithm = 'mayo1') {
    this.algorithm = algorithm;
  }

  private async ensureKeypair(): Promise<CryptoKeypairResult> {
    if (keypairCache[this.algorithm]) return keypairCache[this.algorithm];
    const result = await cryptoKeypair(this.algorithm);
    if (!result.ok || !result.data) throw new Error(`keypair failed: ${result.error}`);
    keypairCache[this.algorithm] = result.data;
    return result.data;
  }

  async generateProof(claim: VeracityClaim): Promise<ZKProof> {
    const kp = await this.ensureKeypair();
    const message = claim.message || `veracity:${claim.claimedVeracity}:${claim.claimedVelocity}:${claim.nodeId}:${Date.now()}`;
    const msgB64 = btoa(message);
    const signResult = await cryptoSign(this.algorithm, msgB64, kp.secret_key);
    if (!signResult.ok || !signResult.data) throw new Error(`sign failed: ${signResult.error}`);

    const proof: ZKProof = {
      proofId: `QPADL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      nodeId: claim.nodeId,
      algorithm: this.algorithm,
      signature: signResult.data.signature,
      publicKey: kp.public_key,
      message: msgB64,
      verificationResult: false,
      timestamp: Date.now(),
    };

    store.dispatch(triggerPhysicalization({
      id: proof.proofId,
      nodeId: claim.nodeId,
      eventType: 'CRYPTO_SIG_RECEIVED',
      resonanceScore: claim.claimedVeracity,
      threshold: 0,
      quorumSize: 3,
      affirmingNodes: 1,
      timestamp: proof.timestamp,
    }));

    return proof;
  }

  async verifyProof(proof: ZKProof): Promise<VerificationResult> {
    try {
      const verifyResult = await cryptoVerify(
        proof.algorithm,
        proof.message,
        proof.signature,
        proof.publicKey,
      );
      if (!verifyResult.ok || !verifyResult.data) {
        return { valid: false, proofId: proof.proofId, error: verifyResult.error };
      }

      proof.verificationResult = verifyResult.data.valid;

      return {
        valid: verifyResult.data.valid,
        proofId: proof.proofId,
      };
    } catch (error) {
      return {
        valid: false,
        proofId: proof.proofId,
        error: error instanceof Error ? error.message : 'Unknown verification error',
      };
    }
  }

  static clearCache() {
    keypairCache = {};
  }

  async batchVerifyProofs(proofs: ZKProof[]): Promise<{ valid: number; invalid: number }> {
    const results = await Promise.all(proofs.map(p => this.verifyProof(p)));
    return {
      valid: results.filter(r => r.valid).length,
      invalid: results.filter(r => !r.valid).length,
    };
  }
}

export const zkProofEngine = new QPADLProofEngine();