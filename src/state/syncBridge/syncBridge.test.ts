import { describe, it, expect, beforeEach } from 'vitest';
import { store } from '../ledger/store';
import { syncCivicBaselineVeracityToLedger } from './syncBridge';
import { loadCivicBaselines, clearCivicBaselines } from '../atoms/civicBaselineAtoms';
import { normalizeCivicBaselineDataset } from '../../logic/civicBaseline';
import civicBaselineSample from '../atoms/fixtures/civicBaselineSample.json';

describe('syncCivicBaselineVeracityToLedger', () => {
  beforeEach(() => {
    clearCivicBaselines();
    loadCivicBaselines(normalizeCivicBaselineDataset(civicBaselineSample));
  });

  it('logs a VERACITY_GATE_CROSSED event when active exceeds the baseline', () => {
    const before = store.getState().veracity.events.length;

    // us-tx:world_bank baseline (VA.EST 1.1) normalizes to 0.72
    syncCivicBaselineVeracityToLedger('us-tx', 'world_bank', 0.95);

    const events = store.getState().veracity.events;
    expect(events.length).toBe(before + 1);

    const last = events[events.length - 1];
    expect(last.nodeId).toBe('us-tx');
    expect(last.eventType).toBe('VERACITY_GATE_CROSSED');
    expect(last.veracityScore).toBeCloseTo(0.23);
    expect(last.causalChain).toEqual(
      expect.arrayContaining([
        'V_active=0.95',
        'baseline_source=world_bank',
        'baseline_indicator=VA.EST',
      ])
    );
  });

  it('does not log an event when active is at or below the baseline', () => {
    const before = store.getState().veracity.events.length;

    syncCivicBaselineVeracityToLedger('us-tx', 'world_bank', 0.5);

    expect(store.getState().veracity.events.length).toBe(before);
  });

  it('no-ops when no baseline is loaded for the given region/source', () => {
    const before = store.getState().veracity.events.length;

    expect(() => syncCivicBaselineVeracityToLedger('unknown-region', 'data_gov', 0.9)).not.toThrow();
    expect(store.getState().veracity.events.length).toBe(before);
  });
});
