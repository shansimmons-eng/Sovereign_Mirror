import { store } from '../state/ledger/store';
import { triggerPhysicalization } from '../state/ledger/slices/physicalizationSlice';
import { useNodeStore } from '../state/stores/nodeStore';
import { GOLDEN_RATIO, THRESHOLD_ENTROPY } from '../logic/types';

const API_BASE = '/api';

interface PGateResponse {
  mode: string;
  level: number;
  threshold: number;
  canEngage: boolean;
  status: string;
  message: string;
  timestamp: number;
}

function getThresholdWithEntropy(): number {
  return GOLDEN_RATIO * (1 + THRESHOLD_ENTROPY);
}

export async function engagePGate(mode: string, level: number): Promise<PGateResponse> {
  const threshold = getThresholdWithEntropy();
  const canEngage = level >= threshold;

  const result: PGateResponse = {
    mode,
    level,
    threshold,
    canEngage,
    status: canEngage ? 'ENGAGED' : 'BLOCKED',
    message: canEngage
      ? `P-Gate engaged at resonance level ${level.toFixed(3)}`
      : `Resonance level ${level.toFixed(3)} below threshold ${threshold.toFixed(3)}`,
    timestamp: Date.now()
  };

  console.log(`%c[PGATE] %c${result.status} %c${result.message}`,
    'color: #FB923C; font-weight: bold;',
    canEngage ? 'color: #86EFAC;' : 'color: #F43F5E;',
    'color: #FFF7ED;'
  );

  if (result.canEngage) {
    store.dispatch(triggerPhysicalization({
      id: `PGATE_${Date.now()}`,
      nodeId: 'GATE_KERNEL',
      eventType: 'P_GATE_TRIGGERED',
      resonanceScore: level,
      threshold: result.threshold,
      quorumSize: 3,
      affirmingNodes: 3,
      timestamp: Date.now(),
    }));

    useNodeStore.getState().setFlux(Math.min(1, level));
  }

  return result;
}

export async function calculateVeracity(active: number, control: number): Promise<number> {
  const response = await fetch(`${API_BASE}/veracity/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active, control }),
  }).catch(() => null);

  if (response?.ok) {
    const result = await response.json();
    return result.veracity;
  }

  return Math.max(0, active - control);
}

export async function fetchRTSW() {
  const response = await fetch(`${API_BASE}/rtsw/latest`).catch(() => null);
  if (response?.ok) {
    const data = await response.json();
    useNodeStore.getState().setRTSW(data);
    return data;
  }
  return null;
}

export async function checkQuorum(activeNodes: number, affirmingNodes: number): Promise<{ quorum: number; reached: boolean }> {
  const response = await fetch(`${API_BASE}/quorum/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activeNodes, affirmingNodes }),
  }).catch(() => null);

  if (response?.ok) {
    const result = await response.json();
    return { quorum: result.quorum, reached: result.reached };
  }

  const quorum = Math.min(activeNodes, Math.ceil(Math.sqrt(activeNodes)) + 2);
  return { quorum, reached: affirmingNodes >= quorum };
}