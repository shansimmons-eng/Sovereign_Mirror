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
    <div className="grid grid-cols-12 gap-2 text-on-surface-variant group hover:bg-white/5 p-1 transition-colors text-[11px]">
      <div className="col-span-3 font-data-mono">{formatTimestamp(event.timestamp)}</div>
      <div className="col-span-2 font-data-mono text-ignition-white">#0x{event.nodeId.slice(0, 4)}</div>
      <div className="col-span-5 font-data-mono truncate">{labels[event.eventType] || event.eventType}</div>
      <div className="col-span-2 text-right font-data-mono">
        <span className="text-solar-amber">V={event.veracityScore.toFixed(2)}</span>
      </div>
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
  };

  return (
    <div className="grid grid-cols-12 gap-2 text-on-surface-variant group hover:bg-white/5 p-1 transition-colors text-[11px]">
      <div className="col-span-3 font-data-mono">{formatTimestamp(event.timestamp)}</div>
      <div className="col-span-2 font-data-mono text-ignition-white">#0x{event.nodeId.slice(0, 4)}</div>
      <div className="col-span-5 font-data-mono truncate">{labels[event.eventType] || event.eventType}</div>
      <div className="col-span-2 text-right font-data-mono">
        <span className={event.affirmingNodes >= event.quorumSize ? 'text-solar-amber' : 'text-veracity-gate-bypass'}>
          Q={event.affirmingNodes}/{event.quorumSize}
        </span>
      </div>
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
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-2 shrink-0">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-solar-amber">receipt_long</span>
          <span className="font-data-mono text-data-mono text-ignition-white">VERACITY_LEDGER_STREAM</span>
        </div>
        <span className="font-status-label text-status-label text-on-surface-variant">LIVE_FEED_ENABLED</span>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {allEvents.length === 0 ? (
          <div className="text-on-surface-variant/40 font-data-mono text-[11px] italic">Awaiting veracity events...</div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-2 text-on-surface-variant/40 border-b border-ignition-white/5 pb-1 mb-2 text-[10px] font-data-mono shrink-0">
              <div className="col-span-3">TIMESTAMP</div>
              <div className="col-span-2">NODE_ID</div>
              <div className="col-span-5">EVENT</div>
              <div className="col-span-2 text-right">STATUS</div>
            </div>
            {allEvents.map((event, i) => {
              if ('veracityScore' in event) {
                return <VeracityEventRow key={event.id || i} event={event} />;
              }
              return <PhysicalizationEventRow key={event.id || i} event={event} />;
            })}
          </>
        )}
      </div>
    </div>
  );
}