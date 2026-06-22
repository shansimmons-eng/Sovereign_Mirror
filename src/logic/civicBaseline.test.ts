import { describe, it, expect } from 'vitest';
import {
  normalizeCivicBaselineRecord,
  normalizeCivicBaselineDataset,
  computeVeracityAgainstBaseline,
  CivicBaselineRecord,
} from './civicBaseline';

describe('normalizeCivicBaselineRecord', () => {
  it('converts a World Bank scale value (-2.5..2.5) to 0..1', () => {
    const result = normalizeCivicBaselineRecord({
      regionId: 'us-tx',
      indicatorId: 'VA.EST',
      indicatorLabel: 'Voice and Accountability',
      value: 1.1,
      source: 'world_bank',
      asOf: '2025-01-01',
    });
    expect(result?.value).toBeCloseTo(0.72);
  });

  it('converts a Data.gov percentage value (0..100) to 0..1', () => {
    const result = normalizeCivicBaselineRecord({
      regionId: 'us-tx',
      indicatorId: 'voter-turnout-2024',
      indicatorLabel: 'Voter Turnout (%)',
      value: 54.3,
      source: 'data_gov',
      asOf: '2024-11-05',
    });
    expect(result?.value).toBeCloseTo(0.543);
  });

  it('clamps out-of-range raw values to [0, 1]', () => {
    const high = normalizeCivicBaselineRecord({
      regionId: 'us-tx',
      indicatorId: 'VA.EST',
      indicatorLabel: 'Voice and Accountability',
      value: 100,
      source: 'world_bank',
      asOf: '2025-01-01',
    });
    expect(high?.value).toBe(1);

    const low = normalizeCivicBaselineRecord({
      regionId: 'us-tx',
      indicatorId: 'voter-turnout-2024',
      indicatorLabel: 'Voter Turnout (%)',
      value: -50,
      source: 'data_gov',
      asOf: '2024-11-05',
    });
    expect(low?.value).toBe(0);
  });

  it('rejects an unknown source', () => {
    expect(normalizeCivicBaselineRecord({
      regionId: 'us-tx',
      indicatorId: 'x',
      indicatorLabel: 'x',
      value: 1,
      source: 'imf',
      asOf: '2025-01-01',
    })).toBeNull();
  });

  it('rejects missing required fields', () => {
    expect(normalizeCivicBaselineRecord({ regionId: 'us-tx' })).toBeNull();
    expect(normalizeCivicBaselineRecord(null)).toBeNull();
  });

  it('rejects a non-finite value', () => {
    expect(normalizeCivicBaselineRecord({
      regionId: 'us-tx',
      indicatorId: 'VA.EST',
      indicatorLabel: 'Voice and Accountability',
      value: NaN,
      source: 'world_bank',
      asOf: '2025-01-01',
    })).toBeNull();
  });
});

describe('normalizeCivicBaselineDataset', () => {
  it('drops invalid records but keeps valid ones', () => {
    const records = normalizeCivicBaselineDataset([
      {
        regionId: 'us-tx',
        indicatorId: 'VA.EST',
        indicatorLabel: 'Voice and Accountability',
        value: 1.1,
        source: 'world_bank',
        asOf: '2025-01-01',
      },
      { regionId: 'missing-fields' },
    ]);
    expect(records).toHaveLength(1);
  });

  it('returns an empty array for non-array input', () => {
    expect(normalizeCivicBaselineDataset(null)).toEqual([]);
    expect(normalizeCivicBaselineDataset('garbage')).toEqual([]);
  });
});

describe('computeVeracityAgainstBaseline', () => {
  const baseline: CivicBaselineRecord = {
    regionId: 'us-tx',
    indicatorId: 'VA.EST',
    indicatorLabel: 'Voice and Accountability',
    value: 0.3,
    source: 'world_bank',
    asOf: '2025-01-01',
  };

  it('delegates to veracityGate: returns the differential when active exceeds the baseline', () => {
    expect(computeVeracityAgainstBaseline(0.8, baseline)).toBeCloseTo(0.5);
  });

  it('returns 0 when active is at or below the baseline', () => {
    expect(computeVeracityAgainstBaseline(0.3, baseline)).toBe(0);
    expect(computeVeracityAgainstBaseline(0.1, baseline)).toBe(0);
  });
});
