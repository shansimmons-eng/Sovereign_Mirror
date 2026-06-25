import { useState, useEffect } from 'react';

interface CryptoAlgorithm {
  id: string;
  level: number;
  enabled: boolean;
  oqs_name: string;
}

interface CryptoStatus {
  algorithms: CryptoAlgorithm[];
  timestamp: number;
}

const FAMILIES: { label: string; layer: string; color: string; algoIds: string[] }[] = [
  { label: 'SPEED', layer: 'MQ — NP-Hard', color: '#06B6D4', algoIds: ['mayo1', 'mayo3', 'mayo5'] },
  { label: 'TRANSITIONAL', layer: 'Lattice — NTRU', color: '#F59E0B', algoIds: ['falcon512'] },
  { label: 'PRIMARY', layer: 'Lattice — Module-LWE, FIPS 204', color: '#10B981', algoIds: ['ml_dsa_65'] },
  { label: 'ANCHOR', layer: 'Hash-Based, FIPS 205 / SLH-DSA', color: '#8B5CF6', algoIds: ['sphincs_256f'] },
];

const LEVEL_LABELS: Record<number, string> = {
  1: 'NIST-I',
  3: 'NIST-III',
  5: 'NIST-V',
};

export function QuantumCryptoPanel() {
  const [status, setStatus] = useState<CryptoStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/crypto/status');
        if (res.ok) {
          setStatus(await res.json());
        }
      } catch {
        // crypto server not available
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const algoMap = new Map<string, CryptoAlgorithm>();
  if (status) {
    for (const a of status.algorithms) {
      algoMap.set(a.id, a);
    }
  }

  return (
    <div className="backdrop-blur-2xl border p-2 md:p-4 rounded-lg" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
      <div className="text-[10px] md:text-[11px] mb-2 md:mb-3 pb-2 border-b flex justify-between items-center" style={{ color: '#FFB300', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <span>QPADL CRYPTO STATUS</span>
        <span className="text-[8px] opacity-50">QUANTUM</span>
      </div>
      <div className="space-y-3">
        {FAMILIES.map((family) => {
          const familyAlgos = family.algoIds
            .map((id) => algoMap.get(id))
            .filter((a): a is CryptoAlgorithm => a !== undefined);
          if (familyAlgos.length === 0) {
            return (
              <div key={family.label} className="p-2 border rounded" style={{ borderColor: `${family.color}33` }}>
                <div className="text-[9px] font-mono" style={{ color: '#c4c7c8' }}>Connecting...</div>
              </div>
            );
          }
          return (
            <div key={family.label} className="p-2 border rounded" style={{ borderColor: `${family.color}33` }}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color: family.color }}>{family.label}</span>
                <span className="text-[7px] font-mono opacity-60">{family.layer}</span>
              </div>
              <div className="space-y-1">
                {familyAlgos.map((algo) => (
                  <div key={algo.id} className="flex justify-between items-center font-mono text-[8px] md:text-[9px]" style={{ color: '#c4c7c8' }}>
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${algo.enabled ? 'animate-pulse' : ''}`} style={{ backgroundColor: algo.enabled ? '#00FF41' : '#666' }} />
                      <span>{algo.oqs_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-1 py-0.5 rounded text-[7px]`} style={{ backgroundColor: `${LEVEL_LABELS[algo.level] ? 'rgba(255,179,0,0.15)' : 'transparent'}`, color: '#FFB300' }}>
                        {LEVEL_LABELS[algo.level] || `L${algo.level}`}
                      </span>
                      <span style={{ color: algo.enabled ? '#00FF41' : '#666' }}>
                        {algo.enabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {!status && (
          <div className="text-center py-4 font-mono text-[9px]" style={{ color: '#666' }}>
            CONNECTING TO CRYPTO SERVER...
          </div>
        )}
      </div>
    </div>
  );
}
