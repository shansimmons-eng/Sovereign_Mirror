import { veracityGate } from './veracityGate';

export type CivicBaselineSource = 'world_bank' | 'data_gov';

export interface CivicBaselineRecord {
  regionId: string;
  indicatorId: string;
  indicatorLabel: string;
  value: number;
  source: CivicBaselineSource;
  asOf: string;
}

const SOURCES = new Set<CivicBaselineSource>(['world_bank', 'data_gov']);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Converts a raw indicator value to the app's existing 0..1 convention
 * (matching veracityScore/resonanceScore ranges), based on source-specific
 * real-world scales.
 */
function normalizeRawValue(rawValue: number, source: CivicBaselineSource): number | null {
  if (!isFinite(rawValue)) return null;
  if (source === 'world_bank') {
    // World Bank "Voice and Accountability" style indicators run -2.5..2.5
    return clamp01((rawValue + 2.5) / 5);
  }
  // Data.gov-style indicators (e.g. voter turnout) arrive as a percentage 0..100
  return clamp01(rawValue / 100);
}

export function normalizeCivicBaselineRecord(raw: unknown): CivicBaselineRecord | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.regionId) || !isNonEmptyString(r.indicatorId)) return null;
  if (!isNonEmptyString(r.indicatorLabel) || !isNonEmptyString(r.asOf)) return null;
  if (!isNonEmptyString(r.source) || !SOURCES.has(r.source as CivicBaselineSource)) return null;
  if (typeof r.value !== 'number') return null;

  const value = normalizeRawValue(r.value, r.source as CivicBaselineSource);
  if (value === null) return null;

  return {
    regionId: r.regionId,
    indicatorId: r.indicatorId,
    indicatorLabel: r.indicatorLabel,
    value,
    source: r.source as CivicBaselineSource,
    asOf: r.asOf,
  };
}

/**
 * Normalizes a raw (possibly malformed) civic baseline dataset. Invalid
 * records are dropped rather than throwing, matching civicSchema.ts.
 */
export function normalizeCivicBaselineDataset(raw: unknown): CivicBaselineRecord[] {
  if (!Array.isArray(raw)) return [];
  const records: CivicBaselineRecord[] = [];
  for (const item of raw) {
    const normalized = normalizeCivicBaselineRecord(item);
    if (normalized) records.push(normalized);
  }
  return records;
}

/**
 * Applies the existing Veracity Gate using a civic baseline record as
 * V_control. Named for the civic-data vocabulary; delegates to veracityGate.
 */
export function computeVeracityAgainstBaseline(
  activeValue: number,
  baseline: CivicBaselineRecord
): number {
  return veracityGate(activeValue, baseline.value);
}
