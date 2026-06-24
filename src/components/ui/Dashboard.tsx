import { ResonanceTrajectory } from '../three/ResonanceTrajectory';
import { VeracityLog } from '../hud/VeracityLog';
import { useHUDStore } from '../../state/stores/hudStore';
import { SystemicSliders } from './SystemicSliders';
import { PGateButton } from './PGateButton';
import { CryptoStatusPanel } from './CryptoStatusPanel';

export function Dashboard() {
  const sunriseOpacity = useHUDStore((s) => s.sunriseOpacity);

  return (
    <div
      className="relative z-10 min-h-screen p-6 grid grid-cols-12 gap-4"
      style={{
        background: 'transparent',
      }}
    >
      <div className="col-span-3 glassmorphism-dark p-4">
        <div className="text-radiant-cream font-mono text-sm mb-4">SYSTEMIC PARAMETERS</div>
        <SystemicSliders />
        <PGateButton nodeId="NODE_001" />
      </div>

      <div className="col-span-6 glassmorphism p-4 flex flex-col">
        <div className="text-radiant-cream font-mono text-sm mb-4">RESONANCE TRAJECTORY</div>
        <div className="flex-1 relative" style={{ minHeight: '400px' }}>
          <ResonanceTrajectory />
        </div>
      </div>

      <div className="col-span-3 glassmorphism-dark p-4 flex flex-col">
        <div className="text-radiant-cream font-mono text-sm mb-4">NODE STATUS</div>
        <div className="flex-1">
          <NodeStatusPanel />
          <CryptoStatusPanel />
        </div>
      </div>

      <div className="col-span-12 glassmorphism-dark p-4 h-64">
        <VeracityLog />
      </div>
    </div>
  );
}

function NodeStatusPanel() {
  const temperature = useHUDStore((s) => s.temperature);
  const noiseFilter = useHUDStore((s) => s.noiseFilter);
  const sunriseOpacity = useHUDStore((s) => s.sunriseOpacity);
  const effectiveTickRate = useHUDStore((s) => s.effectiveTickRate);

  return (
    <div className="text-radiant-cream font-mono text-xs space-y-2">
      <div className="flex justify-between">
        <span className="text-white/50">Temperature:</span>
        <span className="text-ultranetic-amber">{(temperature * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/50">Noise Filter:</span>
        <span className="text-ultranetic-amber">{(noiseFilter * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/50">Sunrise Opacity:</span>
        <span className="text-physical-rose">{sunriseOpacity.toFixed(3)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-white/50">Tick Rate:</span>
        <span className="text-healed-sage">{effectiveTickRate.toFixed(0)}ms</span>
      </div>
    </div>
  );
}