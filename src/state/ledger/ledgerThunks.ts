export interface LedgerEntry {
  id: string;
  nodeId: string;
  eventType: string;
  timestamp: number;
  slice?: 'veracity' | 'physicalization';
  [key: string]: unknown;
}

export interface LedgerHistoryResponse {
  count: number;
  entries: LedgerEntry[];
}

export async function fetchLedgerHistory(
  params?: { since?: number; slice?: 'veracity' | 'physicalization' }
): Promise<LedgerHistoryResponse> {
  const search = new URLSearchParams();
  if (params?.since) search.set('since', String(params.since));
  if (params?.slice) search.set('slice', params.slice);
  const qs = search.toString();
  const url = `/api/ledger/history${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`ledger fetch failed: ${res.status}`);
  return res.json();
}

export async function loadLedger(): Promise<LedgerEntry[]> {
  try {
    const { entries } = await fetchLedgerHistory();
    return entries;
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('[LEDGER] hydrate failed:', e);
    }
    return [];
  }
}