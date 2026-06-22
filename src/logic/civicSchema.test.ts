import { describe, it, expect } from 'vitest';
import {
  normalizeOrganization,
  normalizePerson,
  normalizeVoteEvent,
  normalizeCivicDataset,
} from './civicSchema';
import civicSample from '../state/atoms/fixtures/civicSample.json';

describe('normalizeOrganization', () => {
  it('accepts a well-formed organization', () => {
    const result = normalizeOrganization({
      id: 'ocd-organization/1',
      name: 'Austin City Council',
      classification: 'legislature',
      jurisdictionId: 'ocd-jurisdiction/1',
    });
    expect(result).toEqual({
      id: 'ocd-organization/1',
      name: 'Austin City Council',
      classification: 'legislature',
      jurisdictionId: 'ocd-jurisdiction/1',
    });
  });

  it('defaults a missing jurisdictionId to null', () => {
    const result = normalizeOrganization({
      id: 'ocd-organization/1',
      name: 'Austin City Council',
      classification: 'legislature',
    });
    expect(result?.jurisdictionId).toBeNull();
  });

  it('rejects missing required fields', () => {
    expect(normalizeOrganization({ name: 'No ID' })).toBeNull();
    expect(normalizeOrganization({ id: 'x' })).toBeNull();
    expect(normalizeOrganization(null)).toBeNull();
    expect(normalizeOrganization('not an object')).toBeNull();
  });

  it('rejects wrong-typed fields', () => {
    expect(normalizeOrganization({ id: 'x', name: 'y', classification: 5 })).toBeNull();
  });
});

describe('normalizePerson', () => {
  it('accepts a well-formed person', () => {
    const result = normalizePerson({
      id: 'ocd-person/1',
      name: 'Jane Rivera',
      partyName: 'Independent',
      currentOrgId: 'ocd-organization/1',
    });
    expect(result?.name).toBe('Jane Rivera');
  });

  it('rejects missing id or name', () => {
    expect(normalizePerson({ name: 'No ID' })).toBeNull();
    expect(normalizePerson({ id: 'x' })).toBeNull();
  });
});

describe('normalizeVoteEvent', () => {
  const validVoteEvent = {
    id: 'ocd-vote-event/1',
    motionText: 'Approve budget',
    startDate: '2026-05-12',
    result: 'pass',
    organizationId: 'ocd-organization/1',
    voteCounts: [
      { option: 'yes', value: 7 },
      { option: 'no', value: 2 },
    ],
  };

  it('accepts a well-formed vote event', () => {
    const result = normalizeVoteEvent(validVoteEvent);
    expect(result?.voteCounts).toHaveLength(2);
    expect(result?.result).toBe('pass');
  });

  it('rejects an invalid result value', () => {
    expect(normalizeVoteEvent({ ...validVoteEvent, result: 'maybe' })).toBeNull();
  });

  it('drops malformed vote counts but keeps valid ones', () => {
    const result = normalizeVoteEvent({
      ...validVoteEvent,
      voteCounts: [
        { option: 'yes', value: 7 },
        { option: 'invalid-option', value: 1 },
        { option: 'no', value: 'not-a-number' },
      ],
    });
    expect(result?.voteCounts).toEqual([{ option: 'yes', value: 7 }]);
  });

  it('rejects missing organizationId', () => {
    const { organizationId, ...rest } = validVoteEvent;
    expect(normalizeVoteEvent(rest)).toBeNull();
  });
});

describe('normalizeCivicDataset', () => {
  it('normalizes the OCD-shaped sample fixture', () => {
    const dataset = normalizeCivicDataset(civicSample);
    expect(dataset.organizations).toHaveLength(1);
    expect(dataset.people).toHaveLength(2);
    expect(dataset.voteEvents).toHaveLength(1);
    expect(dataset.organizations[0].name).toBe('Austin City Council');
  });

  it('drops invalid records but keeps valid ones in the same dataset', () => {
    const dataset = normalizeCivicDataset({
      organizations: [
        { id: 'ocd-organization/1', name: 'Valid Org', classification: 'legislature' },
        { name: 'Missing ID' },
      ],
      people: [{ id: 'x' }],
      voteEvents: [],
    });
    expect(dataset.organizations).toHaveLength(1);
    expect(dataset.people).toHaveLength(0);
  });

  it('returns empty arrays for missing or malformed input', () => {
    expect(normalizeCivicDataset(null)).toEqual({ organizations: [], people: [], voteEvents: [] });
    expect(normalizeCivicDataset({})).toEqual({ organizations: [], people: [], voteEvents: [] });
    expect(normalizeCivicDataset('garbage')).toEqual({ organizations: [], people: [], voteEvents: [] });
  });
});
