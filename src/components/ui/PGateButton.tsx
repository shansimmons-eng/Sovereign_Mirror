import { useHUDStore } from '../../state/stores/hudStore';
import { useNodeStore } from '../../state/stores/nodeStore';
import { engagePGate } from '../../services/apiService';

interface PGateButtonProps {
  nodeId?: string;
}

export function PGateButton(_props: PGateButtonProps) {
  const effectiveTickRate = useHUDStore((s) => s.effectiveTickRate);
  const flux = useNodeStore((s) => s.flux);
  const syncStatus = useNodeStore((s) => s.syncStatus);
  const syncProgress = useNodeStore((s) => s.syncProgress);
  const setSyncStatus = useNodeStore((s) => s.setSyncStatus);

  const handleEngage = async () => {
    const targetLevel = flux > 0 ? flux : 0.75;
    const result = await engagePGate('resonance', targetLevel);
    console.log('[PGATE] Engagement result:', result);
  };

  const handleSyncClick = () => {
    if (syncStatus === 'STANDBY') {
      setSyncStatus('SYNCING', 1);
    }
  };

  const isDecayed = flux < 0.15;

  const statusClass = isDecayed ? 'physical' : flux > 0.661 ? 'refining' : 'virtual';

  const getStatusDisplay = () => {
    if (syncStatus === 'STANDBY') {
      return <span className="pgate-text-muted">STANDBY</span>;
    }
    if (syncStatus === 'SYNCING') {
      return (
        <span className="pgate-text-primary opacity-80">
          SYNCING {syncProgress}/7
        </span>
      );
    }
    if (flux > 0.661) {
      return <span className="pgate-text-primary">ACTIVE</span>;
    }
    if (flux > 0.3) {
      return (
        <span className="pgate-text-primary opacity-80">
          SYNCING {(flux / 0.661 * 7).toFixed(0)}/7
        </span>
      );
    }
    return <span className="pgate-text-muted">STANDBY</span>;
  };

  return (
    <div className="mt-6">
      <button
        className={`pgate-btn w-full py-4 font-mono text-sm font-semibold ${statusClass}`}
        onClick={isDecayed ? handleSyncClick : handleEngage}
      >
        <div className="flex flex-col items-center">
          <span className="pgate-text-primary mb-1">P-GATE</span>
          {getStatusDisplay()}
        </div>
      </button>

      <button
        className="pgate-test w-full py-2 font-mono text-xs mt-2"
        onClick={async () => {
          const result = await engagePGate('resonance', 0.75);
          console.log('[PGATE] Direct engagement:', result);
        }}
      >
        <span className="pgate-text-primary">Test API (0.75)</span>
      </button>

      <div className="mt-3 text-center text-on-surface-variant font-mono text-xs">
        Tick Rate: {effectiveTickRate.toFixed(0)}ms | Flux: {flux.toFixed(3)}
      </div>
    </div>
  );
}