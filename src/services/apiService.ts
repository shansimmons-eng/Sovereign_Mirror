import { store } from '../state/ledger/store';
import { triggerPhysicalization } from '../state/ledger/slices/physicalizationSlice';
import { useNodeStore } from '../state/stores/nodeStore';

const API_BASE = '/api';

type PGateMode = 'resonance' | 'refining' | 'virtual';

const VALID_MODES = new Set<PGateMode>(['resonance', 'refining', 'virtual']);

interface Result<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}
function err<T>(error: string): Result<T> {
  return { ok: false, error };
}

async function get<T>(path: string, validate?: (v: unknown) => T | null): Promise<Result<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch (e) {
    return err('Network error');
  }
  if (!response.ok) {
    return err(`HTTP ${response.status}`);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return err('Invalid JSON');
  }
  if (validate) {
    const validated = validate(body);
    if (validated === null) return err('Invalid response shape');
    return ok(validated);
  }
  return ok(body as T);
}

async function post<T>(path: string, body: unknown, validate?: (v: unknown) => T | null): Promise<Result<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return err('Network error');
  }
  if (!response.ok) {
    return err(`HTTP ${response.status}`);
  }
  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return err('Invalid JSON');
  }
  if (validate) {
    const validated = validate(parsed);
    if (validated === null) return err('Invalid response shape');
    return ok(validated);
  }
  return ok(parsed as T);
}

interface PGateResponse {
  mode: string;
  level: number;
  threshold: number;
  canEngage: boolean;
  status: string;
  message: string;
  timestamp: number;
}

function validatePGate(v: unknown): PGateResponse | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.mode !== 'string') return null;
  if (typeof o.level !== 'number' || !isFinite(o.level)) return null;
  if (typeof o.threshold !== 'number' || !isFinite(o.threshold)) return null;
  if (typeof o.canEngage !== 'boolean') return null;
  if (typeof o.status !== 'string') return null;
  if (typeof o.message !== 'string') return null;
  if (typeof o.timestamp !== 'number') return null;
  return o as PGateResponse;
}

export async function engagePGate(mode: string, level: number): Promise<Result<PGateResponse>> {
  if (!VALID_MODES.has(mode as PGateMode)) {
    return err('Invalid mode: must be resonance, refining, or virtual');
  }

  const serverResult = await post<PGateResponse>('/pgate/engage', { mode, level }, validatePGate);
  if (!serverResult.ok) {
    return serverResult;
  }

  const result = serverResult.data!;

  console.log(`%c[PGATE] %c${result.status} %c${result.message}`,
    'color: #FB923C; font-weight: bold;',
    result.canEngage ? 'color: #86EFAC;' : 'color: #F43F5E;',
    'color: #FFF7ED;'
  );

  if (result.canEngage) {
    store.dispatch(triggerPhysicalization({
      id: crypto.randomUUID(),
      nodeId: 'GATE_KERNEL',
      eventType: 'P_GATE_TRIGGERED',
      resonanceScore: result.level,
      threshold: result.threshold,
      quorumSize: 3,
      affirmingNodes: 3,
      timestamp: result.timestamp,
    }));

    useNodeStore.getState().setFlux(Math.min(1, result.level));
  }

  return ok(result);
}

interface VeracityResponse {
  veracity: number;
  timestamp: number;
}

function validateVeracity(v: unknown): VeracityResponse | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.veracity !== 'number' || !isFinite(o.veracity)) return null;
  if (typeof o.timestamp !== 'number') return null;
  return o as VeracityResponse;
}

export async function calculateVeracity(active: number, control: number): Promise<Result<number>> {
  const result = await post<VeracityResponse>('/veracity/calculate', { active, control }, validateVeracity);
  if (result.ok) return ok(result.data!.veracity);
  return err(result.error);
}

interface RTSWData {
  speed: number;
  density: number;
  temperature: number;
  bx: number;
  by: number;
  bz: number;
  bt: number;
  timestamp: number;
  source: string;
}

function validateRTSW(v: unknown): RTSWData | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.speed !== 'number' || !isFinite(o.speed)) return null;
  if (typeof o.density !== 'number' || !isFinite(o.density)) return null;
  if (typeof o.temperature !== 'number' || !isFinite(o.temperature)) return null;
  if (typeof o.bx !== 'number' || !isFinite(o.bx)) return null;
  if (typeof o.by !== 'number' || !isFinite(o.by)) return null;
  if (typeof o.bz !== 'number' || !isFinite(o.bz)) return null;
  if (typeof o.bt !== 'number' || !isFinite(o.bt)) return null;
  return {
    speed: o.speed,
    density: o.density,
    temperature: o.temperature,
    bx: o.bx,
    by: o.by,
    bz: o.bz,
    bt: o.bt,
    timestamp: typeof o.timestamp === 'number' ? o.timestamp : Date.now(),
    source: typeof o.source === 'string' ? o.source : 'server',
  };
}

export async function fetchRTSW(): Promise<Result<RTSWData>> {
  const result = await get<RTSWData>('/rtsw/latest', validateRTSW);
  if (result.ok && result.data) {
    useNodeStore.getState().setRTSW(result.data);
  }
  return result;
}

interface QuorumResponse {
  quorum: number;
  reached: boolean;
  timestamp: number;
}

function validateQuorum(v: unknown): QuorumResponse | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.quorum !== 'number' || !isFinite(o.quorum)) return null;
  if (typeof o.reached !== 'boolean') return null;
  if (typeof o.timestamp !== 'number') return null;
  return o as QuorumResponse;
}

export async function checkQuorum(activeNodes: number, affirmingNodes: number): Promise<Result<{ quorum: number; reached: boolean }>> {
  const result = await post<QuorumResponse>('/quorum/calculate', { activeNodes, affirmingNodes }, validateQuorum);
  if (result.ok && result.data) {
    return ok({ quorum: result.data.quorum, reached: result.data.reached });
  }
  if (result.error) return err(result.error);

  const quorum = Math.min(activeNodes, Math.ceil(Math.sqrt(activeNodes)) + 2);
  return ok({ quorum, reached: affirmingNodes >= quorum });
}