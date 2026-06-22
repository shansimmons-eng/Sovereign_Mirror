export interface CivicOrganization {
  id: string;
  name: string;
  classification: string;
  jurisdictionId: string | null;
}

export interface CivicPerson {
  id: string;
  name: string;
  partyName: string | null;
  currentOrgId: string | null;
}

export type CivicVoteOption = 'yes' | 'no' | 'abstain' | 'other';

export interface CivicVoteCount {
  option: CivicVoteOption;
  value: number;
}

export interface CivicVoteEvent {
  id: string;
  motionText: string;
  startDate: string;
  result: 'pass' | 'fail' | 'unknown';
  organizationId: string;
  voteCounts: CivicVoteCount[];
}

export interface CivicDataset {
  organizations: CivicOrganization[];
  people: CivicPerson[];
  voteEvents: CivicVoteEvent[];
}

const VOTE_OPTIONS = new Set<CivicVoteOption>(['yes', 'no', 'abstain', 'other']);
const VOTE_RESULTS = new Set(['pass', 'fail', 'unknown']);

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

function isNullableString(v: unknown): v is string | null {
  return v === null || typeof v === 'string';
}

export function normalizeOrganization(raw: unknown): CivicOrganization | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.id) || !isNonEmptyString(r.name)) return null;
  if (!isNonEmptyString(r.classification)) return null;
  if (!isNullableString(r.jurisdictionId ?? null)) return null;
  return {
    id: r.id,
    name: r.name,
    classification: r.classification,
    jurisdictionId: (r.jurisdictionId as string | null) ?? null,
  };
}

export function normalizePerson(raw: unknown): CivicPerson | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.id) || !isNonEmptyString(r.name)) return null;
  if (!isNullableString(r.partyName ?? null)) return null;
  if (!isNullableString(r.currentOrgId ?? null)) return null;
  return {
    id: r.id,
    name: r.name,
    partyName: (r.partyName as string | null) ?? null,
    currentOrgId: (r.currentOrgId as string | null) ?? null,
  };
}

function normalizeVoteCount(raw: unknown): CivicVoteCount | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.option) || !VOTE_OPTIONS.has(r.option as CivicVoteOption)) return null;
  if (typeof r.value !== 'number' || !isFinite(r.value)) return null;
  return { option: r.option as CivicVoteOption, value: r.value };
}

export function normalizeVoteEvent(raw: unknown): CivicVoteEvent | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!isNonEmptyString(r.id) || !isNonEmptyString(r.motionText)) return null;
  if (!isNonEmptyString(r.startDate) || !isNonEmptyString(r.organizationId)) return null;
  if (!isNonEmptyString(r.result) || !VOTE_RESULTS.has(r.result)) return null;
  if (!Array.isArray(r.voteCounts)) return null;

  const voteCounts: CivicVoteCount[] = [];
  for (const vc of r.voteCounts) {
    const normalized = normalizeVoteCount(vc);
    if (normalized) voteCounts.push(normalized);
  }

  return {
    id: r.id,
    motionText: r.motionText,
    startDate: r.startDate,
    result: r.result as CivicVoteEvent['result'],
    organizationId: r.organizationId,
    voteCounts,
  };
}

/**
 * Normalizes a raw (possibly malformed) civic dataset. Invalid records are
 * dropped rather than throwing, since real-world civic source data is messy.
 */
export function normalizeCivicDataset(raw: unknown): CivicDataset {
  const r = (typeof raw === 'object' && raw !== null) ? raw as Record<string, unknown> : {};

  const organizations: CivicOrganization[] = [];
  if (Array.isArray(r.organizations)) {
    for (const org of r.organizations) {
      const normalized = normalizeOrganization(org);
      if (normalized) organizations.push(normalized);
    }
  }

  const people: CivicPerson[] = [];
  if (Array.isArray(r.people)) {
    for (const person of r.people) {
      const normalized = normalizePerson(person);
      if (normalized) people.push(normalized);
    }
  }

  const voteEvents: CivicVoteEvent[] = [];
  if (Array.isArray(r.voteEvents)) {
    for (const voteEvent of r.voteEvents) {
      const normalized = normalizeVoteEvent(voteEvent);
      if (normalized) voteEvents.push(normalized);
    }
  }

  return { organizations, people, voteEvents };
}
