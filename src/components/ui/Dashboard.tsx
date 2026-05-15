import { ResonanceTrajectory } from '../three/ResonanceTrajectory';
import { VeracityLog } from '../hud/VeracityLog';
import { useHUDStore } from '../../state/stores/hudStore';
import { SystemicSliders } from './SystemicSliders';
import { PGateButton } from './PGateButton';

export function Dashboard() {
  const handleNavClick = (section: string) => {
    console.log(`[NAV] ${section} clicked`);
  };

  return (
    <div className="relative z-10 min-h-screen flex flex-col" style={{ backgroundColor: '#000000', color: '#e5e2e1' }}>
      <header className="backdrop-blur-xl border-b flex justify-between items-center w-full px-16 h-16 shrink-0" style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold tracking-tighter" style={{ color: '#ffffff' }}>SOVEREIGN MIRROR</h1>
          <span className="text-xs px-2 py-1 hidden md:inline" style={{ color: '#FFB300', backgroundColor: 'rgba(255, 179, 0, 0.1)', border: '1px solid rgba(255, 179, 0, 0.2)' }}>RESONANCE_TRAJECTORY</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex gap-4">
            <button onClick={() => handleNavClick('sensors')} className="material-symbols-outlined cursor-pointer transition-colors hover:text-amber-400" style={{ color: '#ffffff', background: 'none', border: 'none' }}>sensors</button>
            <button onClick={() => handleNavClick('network_ping')} className="material-symbols-outlined cursor-pointer transition-colors hover:text-amber-400" style={{ color: '#ffffff', background: 'none', border: 'none' }}>network_ping</button>
            <button onClick={() => handleNavClick('settings')} className="material-symbols-outlined cursor-pointer transition-colors hover:text-amber-400" style={{ color: '#ffffff', background: 'none', border: 'none' }}>settings</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        <nav className="fixed left-0 top-16 h-[calc(100vh-128px)] z-40 flex flex-col backdrop-blur-2xl border-r w-64 shrink-0" style={{ backgroundColor: 'rgba(10, 10, 10, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="p-6 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div className="text-lg" style={{ color: '#ffffff' }}>CU_CONTROL</div>
            <div className="text-[10px] opacity-60" style={{ color: '#c4c7c8' }}>SYSTEMIC_PARAMETERS_v4.2</div>
          </div>
          <div className="flex-1 py-4 flex flex-col gap-1 overflow-y-auto">
            <button onClick={() => handleNavClick('Systemic Parameters')} className="pl-4 py-3 transition-all flex items-center gap-3 border-l-2 text-left" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#ffffff', borderColor: '#FFB300', border: 'none', borderLeft: '2px solid #FFB300' }}>
              <span className="material-symbols-outlined">analytics</span>
              <span className="text-[10px] font-mono">Systemic Parameters</span>
            </button>
            <button onClick={() => handleNavClick('Trajectory Matrix')} className="px-4 py-3 font-mono transition-all flex items-center gap-3 hover:pl-6 text-left" style={{ color: '#c4c7c8', background: 'none', border: 'none' }}>
              <span className="material-symbols-outlined">grain</span>
              <span className="text-[10px] font-mono">Trajectory Matrix</span>
            </button>
            <button onClick={() => handleNavClick('Flux Density')} className="px-4 py-3 font-mono transition-all flex items-center gap-3 hover:pl-6 text-left" style={{ color: '#c4c7c8', background: 'none', border: 'none' }}>
              <span className="material-symbols-outlined">bolt</span>
              <span className="text-[10px] font-mono">Flux Density</span>
            </button>
            <button onClick={() => handleNavClick('Quantum Alignment')} className="px-4 py-3 font-mono transition-all flex items-center gap-3 hover:pl-6 text-left" style={{ color: '#c4c7c8', background: 'none', border: 'none' }}>
              <span className="material-symbols-outlined">architecture</span>
              <span className="text-[10px] font-mono">Quantum Alignment</span>
            </button>
          </div>
          <div className="p-4 mt-auto">
            <button onClick={() => handleNavClick('INITIATE_IGNITION')} className="w-full py-4 font-mono font-bold tracking-widest uppercase transition-colors" style={{ backgroundColor: '#FFB300', color: '#000000', border: 'none', cursor: 'pointer' }}>
              INITIATE_IGNITION
            </button>
          </div>
        </nav>

        <main className="ml-64 flex-1 relative flex flex-col overflow-hidden p-8" style={{ backgroundColor: '#000000' }}>
          <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
            <div className="col-span-12 lg:col-span-8 backdrop-blur-2xl rounded-lg p-6 flex flex-col relative overflow-hidden border" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)', minHeight: '300px' }}>
              <div className="scanline" />
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 animate-pulse" style={{ backgroundColor: '#FFB300', boxShadow: '0 0 8px #FFB300' }}></div>
                    <span className="text-xs font-mono" style={{ color: '#ffffff' }}>RESONANCE TRAJECTORY VISUALIZER</span>
                  </div>
                </div>
                <div className="flex gap-4 text-[11px] font-mono" style={{ color: '#c4c7c8' }}>
                  <span>dV [VARIANCE]: <span style={{ color: '#ffffff' }}>~±1.42</span></span>
                  <span>FRAME: <span style={{ color: '#FFB300' }}>16.6ms</span></span>
                </div>
              </div>
              <div className="flex-1 relative min-h-0" style={{ minHeight: '200px' }}>
                <ResonanceTrajectory />
              </div>
              <div className="mt-4 flex justify-between text-[10px] font-mono border-t pt-4" style={{ color: '#c4c7c8', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <span style={{ color: '#FFB300' }}>INVERION_DIVIDE: SHRED_ACTIVE</span>
                <span>NODE_SYNC_ID: 0x4FF2A</span>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
              <div className="backdrop-blur-2xl border p-6 rounded-lg" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <div className="text-[11px] mb-4 pb-2 border-b" style={{ color: '#FFB300', borderColor: 'rgba(255, 255, 255, 0.1)' }}>CU SYSTEMIC PARAMETERS</div>
                <SystemicSliders />
              </div>

              <div className="backdrop-blur-2xl border p-6 rounded-lg flex flex-col" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <div className="font-mono text-sm mb-4" style={{ color: '#FFF7ED' }}>NODE STATUS</div>
                <div className="flex-1">
                  <NodeStatusPanel />
                </div>
                <PGateButton nodeId="NODE_001" />
              </div>
            </div>

            <div className="col-span-12 backdrop-blur-2xl border p-4 rounded-lg" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)', height: '200px' }}>
              <VeracityLog />
            </div>
          </div>
        </main>
      </div>

      <footer className="h-24 z-50 flex-shrink-0 flex flex-col border-t" style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)', borderColor: 'rgba(255, 179, 0, 0.2)' }}>
        <div className="flex-1 grid grid-cols-12 gap-4 px-4 py-2 overflow-hidden">
          <div className="col-span-8 flex flex-col h-full border-r pr-4 overflow-hidden" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-mono" style={{ color: '#ffffff' }}>VERACITY LEDGER - SESSION_0xFA2</span>
              <div className="flex gap-4 text-[9px] font-mono" style={{ color: '#636565' }}>
                <span className="cursor-pointer transition-colors hover:text-white">LATEST_LOGS</span>
                <span className="cursor-pointer transition-colors hover:text-white">ERROR_STREAMS</span>
                <span className="cursor-pointer transition-colors hover:text-white">SYNC_STATUS</span>
              </div>
            </div>
            <div className="flex-1 font-mono text-[10px] space-y-1 overflow-y-auto pr-2 scrollbar-thin" style={{ color: '#c4c7c8' }}>
              <div className="flex gap-4">
                <span style={{ color: '#FFB300' }}>[AUDIT]</span>
                <span style={{ color: '#ffffff' }}>[ZKPROOF_PASS]</span>
                <span>dV_Variance: 0.880, Instance Count: 100.</span>
                <span className="ml-auto opacity-50">2026-05-21 14:32:00 GMT</span>
              </div>
              <div className="flex gap-4">
                <span style={{ color: '#FFB300' }}>[AUDIT]</span>
                <span style={{ color: '#ffffff' }}>[ZKPROOF_PASS]</span>
                <span>dV_Variance: 0.882, Instance Count: 100.</span>
                <span className="ml-auto opacity-50">2026-05-21 14:32:04 GMT</span>
              </div>
            </div>
          </div>
          <div className="col-span-4 flex flex-col h-full justify-between">
            <div className="text-[10px] font-mono mb-1" style={{ color: '#c4c7c8' }}>SOVEREIGN ARCHIVE MONITOR</div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono flex justify-between" style={{ color: '#636565' }}>
                <span>Database Latency:</span>
                <span style={{ color: '#ffffff' }}>22ms</span>
              </div>
              <div className="text-[10px] font-mono flex justify-between" style={{ color: '#636565' }}>
                <span>Local Backlog:</span>
                <span style={{ color: '#FFB300' }}>98% (SYNCING)</span>
              </div>
              <div className="h-1 mt-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <div className="h-full" style={{ width: '98%', background: 'linear-gradient(to right, rgba(255, 179, 0, 0.2), #FFB300, #ffffff)' }}></div>
              </div>
            </div>
          </div>
        </div>
        <div className="h-8 flex justify-between items-center px-4 border-t" style={{ backgroundColor: '#000000', borderColor: 'rgba(255, 179, 0, 0.1)' }}>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono" style={{ color: '#ffffff' }}>VERACITY_LEDGER_ACTIVE_SESSION_0xFA2</span>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#FFB300' }}></span>
          </div>
          <div className="font-mono text-[9px] tracking-[0.2em]" style={{ color: '#636565' }}>
            VERIFICATION_KEY: 72A-D9K-X04-88Z
          </div>
        </div>
      </footer>
    </div>
  );
}

function NodeStatusPanel() {
  const temperature = useHUDStore((s) => s.temperature);
  const noiseFilter = useHUDStore((s) => s.noiseFilter);
  const sunriseOpacity = useHUDStore((s) => s.sunriseOpacity);
  const effectiveTickRate = useHUDStore((s) => s.effectiveTickRate);

  return (
    <div className="font-mono text-xs space-y-2" style={{ color: '#c4c7c8' }}>
      <div className="flex justify-between">
        <span>Temperature:</span>
        <span style={{ color: '#FFB300' }}>{(temperature * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between">
        <span>Noise Filter:</span>
        <span style={{ color: '#FFB300' }}>{(noiseFilter * 100).toFixed(1)}%</span>
      </div>
      <div className="flex justify-between">
        <span>Sunrise Opacity:</span>
        <span style={{ color: '#F43F5E' }}>{sunriseOpacity.toFixed(3)}</span>
      </div>
      <div className="flex justify-between">
        <span>Tick Rate:</span>
        <span style={{ color: '#FFB300' }}>{effectiveTickRate.toFixed(0)}ms</span>
      </div>
    </div>
  );
}