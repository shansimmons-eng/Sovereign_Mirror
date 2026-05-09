import { useAtomValue } from 'jotai';
import { pGateConfirmationFamily } from '../../state/atoms/nodeAtoms';
import { useHUDStore } from '../../state/stores/hudStore';
import { useNodeStore } from '../../state/stores/nodeStore';
import { engagePGate } from '../../services/apiService';

interface PGateButtonProps {
  nodeId: string;
}

export function PGateButton({ nodeId }: PGateButtonProps) {
  const pGateState = useAtomValue(pGateConfirmationFamily(nodeId));
  const effectiveTickRate = useHUDStore((s) => s.effectiveTickRate);
  const flux = useNodeStore((s) => s.flux);

  const handleEngage = async () => {
    const targetLevel = flux > 0 ? flux : 0.75;
    const result = await engagePGate('resonance', targetLevel);
    console.log('[PGATE] Engagement result:', result);
  };

  const statusClass = pGateState.canTrigger
    ? 'physical'
    : flux > 0.661
    ? 'refining'
    : 'virtual';

  return (
    <div className="mt-6">
      <button
        className={`p-gate-button w-full py-4 rounded-xl font-mono text-sm font-semibold ${statusClass}`}
        onClick={handleEngage}
      >
        <div className="flex flex-col items-center">
          <span className="text-radiant-cream mb-1">P-GATE</span>
          {flux > 0.661 ? (
            <span className="text-radiant-cream">ACTIVE</span>
          ) : flux > 0.3 ? (
            <span className="text-dawn-obsidian">
              SYNCING {(flux / 0.661 * 7).toFixed(0)}/7
            </span>
          ) : (
            <span className="text-white/40">STANDBY</span>
          )}
        </div>
      </button>

      <button
        className="mt-2 w-full py-2 rounded-lg font-mono text-xs bg-ultranetic-amber/20 border border-ultranetic-amber/30 text-ultranetic-amber hover:bg-ultranetic-amber/30 transition-colors"
        onClick={async () => {
          const result = await engagePGate('resonance', 0.75);
          console.log('[PGATE] Direct engagement:', result);
        }}
      >
        Test API (0.75)
      </button>

      <div className="mt-3 text-center text-white/30 font-mono text-xs">
        Tick Rate: {effectiveTickRate.toFixed(0)}ms | Flux: {flux.toFixed(3)}
      </div>
    </div>
  );
}