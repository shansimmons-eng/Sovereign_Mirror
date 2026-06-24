import { useSelector } from 'react-redux';
import { RootState } from '../../state/ledger/store';
import { VeracityEvent } from '../../state/ledger/slices/veracitySlice';
import { PhysicalizationEvent } from '../../state/ledger/slices/physicalizationSlice';

function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString().replace('T', ' ').slice(0, -1);
}

function VeracityEventRow({ event }: { event: VeracityEvent }) {
  const labels: Record<string, string> = {
    VERACITY_CALCULATED: 'V_SCORE',
    VERACITY_GATE_CROSSED: 'ZKPROOF_PASS',
    RESONANCE_SPIKE_DETECTED: 'ENTROPY_SPIKE',
    ATROPHY_TRIGGERED: 'DECAY_APPLIED',
  };

  return (
    <div className="py-1 border-b border-white/5">
      <span className="text-deprecated-rust">[AUDIT]</span>
      <span className="text-ultranetic-amber ml-2">{labels[event.eventType] || event.eventType}</span>
      <span className="text-white/40 ml-2">NODE_{event.nodeId.slice(0, 6)}</span>
      <span className="text-healed-sage ml-auto">
        V={event.veracityScore.toFixed(4)} dV={event.velocity.toFixed(6)}
      </span>
      <span className="text-white/30 ml-4">{formatTimestamp(event.timestamp)}</span>
    </div>
  );
}

function PhysicalizationEventRow({ event }: { event: PhysicalizationEvent }) {
  const labels: Record<string, string> = {
    P_GATE_ACTIVATED: 'P_GATE_ARM',
    P_GATE_TRIGGERED: 'P_GATE_FIRE',
    QUORUM_REACHED: 'QUORUM_YES',
    NODE_PHYSICALIZED: 'ZKP_VERIFIED',
    PHYSICALIZATION_REJECTED: 'P_GATE_REJECT',
    CRYPTO_SIG_RECEIVED: 'QPADL_SIG',
  };

  const isCrypto = event.eventType === 'CRYPTO_SIG_RECEIVED';
  const tagColor = isCrypto ? 'text-healed-sage' : 'text-physical-rose';
  return (
    <div className="py-1 border-b border-white/5">
      <span className={tagColor}>[AUDIT]</span>
      <span className={`${tagColor} ml-2`}>{labels[event.eventType] || event.eventType}</span>
      <span className="text-white/40 ml-2">NODE_{event.nodeId.slice(0, 6)}</span>
      <span className="text-ultranetic-amber ml-auto">
        R={event.resonanceScore.toFixed(4)} Q={event.affirmingNodes}/{event.quorumSize}
      </span>
      <span className="text-white/30 ml-4">{formatTimestamp(event.timestamp)}</span>
    </div>
  );
}

export function VeracityLog() {
  const veracityEvents = useSelector((state: RootState) => state.veracity.events);
  const physicalizationEvents = useSelector((state: RootState) => state.physicalization.events);

  const allEvents = [...veracityEvents, ...physicalizationEvents]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 50);

  return (
    <div className="glassmorphism-dark p-4 h-full flex flex-col">
      <div className="text-radiant-cream font-mono text-sm mb-3 flex items-center">
        <span className="w-2 h-2 bg-healed-sage rounded-full mr-2 animate-pulse" />
        VERACITY LEDGER
      </div>
      <div className="flex-1 overflow-y-auto veracity-terminal">
        {allEvents.length === 0 ? (
          <div className="text-white/30 italic">Awaiting veracity events...</div>
        ) : (
          allEvents.map((event, i) => {
            if ('veracityScore' in event) {
              return <VeracityEventRow key={event.id || i} event={event} />;
            }
            return <PhysicalizationEventRow key={event.id || i} event={event} />;
          })
        )}
      </div>
    </div>
  );
}