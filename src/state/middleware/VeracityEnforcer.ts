import { NodeAtom } from '../logic/types';
import { veracityGate } from '../logic/veracityGate';

export interface StateDriftError extends Error {
  nodeId: string;
  expected: number;
  actual: number;
  drift: number;
  timestamp: number;
  severity: 'RECOVERABLE' | 'UNRECOVERABLE';
}

interface EnforcerConfig {
  driftThreshold: number;
  onDriftDetected: (error: StateDriftError) => void;
}

const DEFAULT_DRIFT_THRESHOLD = 0.0001;
const MAX_DRIFT_TOLERANCE = 0.01;

class VeracityEnforcerImpl {
  private driftThreshold: number;
  private onDriftDetected: (error: StateDriftError) => void;
  private nodeStateCache: Map<string, { veracity: number; velocity: number; timestamp: number }> = new Map();

  constructor(config: Partial<EnforcerConfig> = {}) {
    this.driftThreshold = config.driftThreshold ?? DEFAULT_DRIFT_THRESHOLD;
    this.onDriftDetected = config.onDriftDetected ?? this.defaultDriftHandler.bind(this);
  }

  validateNodeState(node: NodeAtom): void {
    const computedVeracity = veracityGate(node.veracityScore, node.frictionMultiplier * node.resonanceScore);

    const cached = this.nodeStateCache.get(node.nodeId);
    if (cached) {
      const drift = Math.abs(computedVeracity - cached.veracity);

      if (drift > MAX_DRIFT_TOLERANCE) {
        const error = this.createDriftError(
          node.nodeId,
          cached.veracity,
          computedVeracity,
          drift,
          'UNRECOVERABLE'
        );
        this.onDriftDetected(error);
        throw error;
      }

      if (drift > this.driftThreshold) {
        const warning = this.createDriftError(
          node.nodeId,
          cached.veracity,
          computedVeracity,
          drift,
          'RECOVERABLE'
        );
        this.onDriftDetected(warning);
      }
    }

    this.nodeStateCache.set(node.nodeId, {
      veracity: computedVeracity,
      velocity: node.veracityVelocity,
      timestamp: Date.now(),
    });
  }

  validateVelocityConsistency(node: NodeAtom): void {
    const cache = this.nodeStateCache.get(node.nodeId);
    if (!cache) return;

    const expectedVelocity = cache.veracity / Math.max(1, Date.now() - cache.timestamp);
    const velocityDrift = Math.abs(node.veracityVelocity - expectedVelocity);

    if (velocityDrift > this.driftThreshold * 10) {
      const error = this.createDriftError(
        node.nodeId,
        expectedVelocity,
        node.veracityVelocity,
        velocityDrift,
        'UNRECOVERABLE'
      );
      this.onDriftDetected(error);
      throw error;
    }
  }

  private createDriftError(
    nodeId: string,
    expected: number,
    actual: number,
    drift: number,
    severity: 'RECOVERABLE' | 'UNRECOVERABLE'
  ): StateDriftError {
    const error = new Error(
      `[VERACITY_ENFORCER] State drift detected for ${nodeId}: expected ${expected.toFixed(6)}, got ${actual.toFixed(6)}, drift ${drift.toFixed(6)}`
    ) as StateDriftError;

    error.nodeId = nodeId;
    error.expected = expected;
    error.actual = actual;
    error.drift = drift;
    error.timestamp = Date.now();
    error.severity = severity;

    return error;
  }

  private defaultDriftHandler(error: StateDriftError): void {
    console.error(
      `%c[VERACITY_ENFORCER] %c${error.severity} %c${error.nodeId}`,
      'color: #DC2626; font-weight: bold;',
      error.severity === 'UNRECOVERABLE' ? 'color: #F43F5E; font-weight: bold;' : 'color: #FB923C;',
      'color: #FFF7ED;',
      `\n  Expected: ${error.expected.toFixed(6)} | Actual: ${error.actual.toFixed(6)} | Drift: ${error.drift.toFixed(6)}`,
      `\n  Timestamp: ${new Date(error.timestamp).toISOString()}`
    );

    if (error.severity === 'UNRECOVERABLE') {
      console.error(
        `%c[VERACITY_ENFORCER] %cNode ${error.nodeId} has been FROZEN due to unrecoverable state drift`,
        'color: #DC2626; font-weight: bold; font-size: 14px;',
        'color: #F43F5E;'
      );
    }
  }

  freezeNode(nodeId: string): void {
    console.error(
      `%c[VERACITY_ENFORCER] %cNode ${nodeId} UI FROZEN`,
      'color: #DC2626; font-weight: bold;',
      'color: #F43F5E; font-weight: bold;'
    );
  }

  getStateCacheSize(): number {
    return this.nodeStateCache.size;
  }

  clearCache(): void {
    this.nodeStateCache.clear();
  }
}

export const VeracityEnforcer = new VeracityEnforcerImpl();

export function withVeracityEnforcement<T extends NodeAtom>(
  node: T,
  validator: (n: T) => void = VeracityEnforcer.validateNodeState.bind(VeracityEnforcer)
): void {
  validator(node);
}

export { VeracityEnforcerImpl };