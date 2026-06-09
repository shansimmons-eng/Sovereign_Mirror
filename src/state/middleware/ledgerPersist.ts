import type { Middleware } from '@reduxjs/toolkit';

const PERSIST_ACTIONS: Record<string, 'veracity' | 'physicalization'> = {
  'veracity/logEvent': 'veracity',
  'physicalization/triggerPhysicalization': 'physicalization',
  'physicalization/logPGateState': 'physicalization',
  'physicalization/rejectPhysicalization': 'physicalization',
};

export const ledgerPersistMiddleware: Middleware = () => (next) => (action) => {
  const result = next(action);
  const a = action as { type?: string; payload?: unknown };
  const slice = a.type ? PERSIST_ACTIONS[a.type] : undefined;
  if (slice && a.payload) {
    fetch('/api/ledger/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slice, event: a.payload }),
      keepalive: true,
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof console !== 'undefined') {
        console.warn('[LEDGER] persist failed:', a.type, msg);
      }
    });
  }
  return result;
};
