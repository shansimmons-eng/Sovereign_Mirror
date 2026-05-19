import { useState } from 'react';
import { ResonanceTrajectory } from '../three/ResonanceTrajectory';
import { VeracityLog } from '../hud/VeracityLog';
import { useHUDStore } from '../../state/stores/hudStore';
import { SystemicSliders } from './SystemicSliders';
import { PGateButton } from './PGateButton';

export function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const handleNavClick = (section: string) => {
    console.log(`[NAV] ${section} clicked`);
    setSidebarOpen(false);
  };

  return (
    <div className="relative bg-void-black overflow-hidden flex flex-col" style={{ backgroundColor: '#000000', color: '#e5e2e1', height: '100vh', minHeight: '-webkit-fill-available' }}>
      <header className="backdrop-blur-xl border-b flex justify-between items-center w-full px-4 md:px-16 h-12 md:h-16 shrink-0" style={{ backgroundColor: 'rgba(10, 10, 10, 0.8)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <div className="flex items-center gap-2 md:gap-6">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden material-symbols-outlined cursor-pointer transition-colors hover:text-amber-400 text-sm" style={{ color: '#ffffff', background: 'none', border: 'none' }}>menu</button>
          <h1 className="text-sm md:text-xl font-bold tracking-tighter" style={{ color: '#ffffff' }}>SOVEREIGN MIRROR</h1>
          <span className="text-xs px-2 py-1 hidden md:inline" style={{ color: '#FFB300', backgroundColor: 'rgba(255, 179, 0, 0.1)', border: '1px solid rgba(255, 179, 0, 0.2)' }}>RESONANCE_TRAJECTORY</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 md:gap-4">
            <button onClick={() => handleNavClick('sensors')} className="material-symbols-outlined cursor-pointer transition-colors hover:text-amber-400 text-sm" style={{ color: '#ffffff', background: 'none', border: 'none' }}>sensors</button>
            <button onClick={() => handleNavClick('network_ping')} className="material-symbols-outlined cursor-pointer transition-colors hover:text-amber-400 text-sm" style={{ color: '#ffffff', background: 'none', border: 'none' }}>network_ping</button>
            <button onClick={() => handleNavClick('settings')} className="material-symbols-outlined cursor-pointer transition-colors hover:text-amber-400 text-sm" style={{ color: '#ffffff', background: 'none', border: 'none' }}>settings</button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <nav className={`fixed left-0 top-12 md:top-16 h-[calc(100vh-96px)] md:h-[calc(100vh-128px)] z-50 md:z-40 flex flex-col backdrop-blur-2xl border-r w-48 md:w-64 shrink-0 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} style={{ backgroundColor: 'rgba(10, 10, 10, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
            <div>
              <div className="text-sm md:text-lg" style={{ color: '#ffffff' }}>CU_CONTROL</div>
              <div className="text-[8px] md:text-[10px] opacity-60" style={{ color: '#c4c7c8' }}>SYSTEMIC_PARAMETERS_v4.2</div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden material-symbols-outlined text-white">close</button>
          </div>
          <div className="flex-1 py-2 md:py-4 flex flex-col gap-0 md:gap-1 overflow-y-auto">
            <button onClick={() => handleNavClick('Systemic Parameters')} className="pl-3 md:pl-4 py-2 md:py-3 transition-all flex items-center gap-2 md:gap-3 border-l-2 text-left" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#ffffff', border: 'none', borderLeft: '2px solid #FFB300' }}>
              <span className="material-symbols-outlined text-sm md:text-base">analytics</span>
              <span className="text-[9px] md:text-[10px] font-mono">Systemic Parameters</span>
            </button>
            <button onClick={() => handleNavClick('Trajectory Matrix')} className="px-3 md:px-4 py-2 md:py-3 font-mono transition-all flex items-center gap-2 md:gap-3 hover:pl-5 md:hover:pl-6 text-left" style={{ color: '#c4c7c8', background: 'none', border: 'none' }}>
              <span className="material-symbols-outlined text-sm md:text-base">grain</span>
              <span className="text-[9px] md:text-[10px] font-mono">Trajectory Matrix</span>
            </button>
            <button onClick={() => handleNavClick('Flux Density')} className="px-3 md:px-4 py-2 md:py-3 font-mono transition-all flex items-center gap-2 md:gap-3 hover:pl-5 md:hover:pl-6 text-left" style={{ color: '#c4c7c8', background: 'none', border: 'none' }}>
              <span className="material-symbols-outlined text-sm md:text-base">bolt</span>
              <span className="text-[9px] md:text-[10px] font-mono">Flux Density</span>
            </button>
            <button onClick={() => handleNavClick('Quantum Alignment')} className="px-3 md:px-4 py-2 md:py-3 font-mono transition-all flex items-center gap-2 md:gap-3 hover:pl-5 md:hover:pl-6 text-left" style={{ color: '#c4c7c8', background: 'none', border: 'none' }}>
              <span className="material-symbols-outlined text-sm md:text-base">architecture</span>
              <span className="text-[9px] md:text-[10px] font-mono">Quantum Alignment</span>
            </button>
          </div>
          <div className="p-2 md:p-4 mt-auto">
            <button onClick={() => handleNavClick('INITIATE_IGNITION')} className="w-full py-2 md:py-4 font-mono font-bold tracking-widest uppercase transition-colors text-xs md:text-sm" style={{ backgroundColor: '#FFB300', color: '#000000', border: 'none', cursor: 'pointer' }}>
              IGNITION
            </button>
          </div>
        </nav>

        <main className="flex-1 relative flex flex-col overflow-hidden p-2 md:p-4 md:ml-64" style={{ backgroundColor: '#000000' }}>
          <div className="grid grid-cols-12 gap-2 md:gap-4 flex-1">
            <div className="col-span-12 lg:col-span-8 backdrop-blur-2xl rounded-lg p-2 md:p-4 flex flex-col relative overflow-hidden border" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)', height: '50vh' }}>
              <div className="scanline" />
              <div className="flex justify-between items-start mb-1 md:mb-2 relative z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 animate-pulse" style={{ backgroundColor: '#FFB300', boxShadow: '0 0 8px #FFB300' }}></div>
                    <span className="text-[10px] md:text-xs font-mono" style={{ color: '#ffffff' }}>RESONANCE TRAJECTORY</span>
                  </div>
                </div>
                <div className="flex gap-2 md:gap-4 text-[9px] md:text-[11px] font-mono" style={{ color: '#c4c7c8' }}>
                  <span>dV: <span style={{ color: '#ffffff' }}>~±1.42</span></span>
                  <span className="hidden md:inline">FRAME: <span style={{ color: '#FFB300' }}>16.6ms</span></span>
                </div>
              </div>
              <div className="flex-1 relative" style={{ minHeight: '250px', height: '250px' }}>
                <ResonanceTrajectory />
              </div>
              <div className="mt-1 md:mt-2 flex justify-between text-[9px] md:text-[10px] font-mono border-t pt-2" style={{ color: '#c4c7c8', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <span style={{ color: '#FFB300' }}>INVERION_DIVIDE</span>
                <span>NODE: 0x4FF2A</span>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-2 md:gap-4">
              <div className="backdrop-blur-2xl border p-2 md:p-4 rounded-lg" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <div className="text-[10px] md:text-[11px] mb-2 md:mb-3 pb-2 border-b" style={{ color: '#FFB300', borderColor: 'rgba(255, 255, 255, 0.1)' }}>CU PARAMETERS</div>
                <SystemicSliders />
              </div>

              <div className="backdrop-blur-2xl border p-2 md:p-4 rounded-lg flex flex-col" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                <div className="font-mono text-xs mb-2 md:mb-3" style={{ color: '#FFF7ED' }}>NODE STATUS</div>
                <div className="flex-1">
                  <NodeStatusPanel />
                </div>
                <PGateButton nodeId="NODE_001" />
              </div>
            </div>

            <div className="col-span-12 backdrop-blur-2xl border p-2 md:p-4 rounded-lg flex-1" style={{ backgroundColor: 'rgba(10, 10, 10, 0.6)', borderColor: 'rgba(255, 255, 255, 0.1)', minHeight: '0' }}>
              <VeracityLog />
            </div>
          </div>
        </main>
      </div>

      <footer className="h-16 md:h-24 z-50 flex-shrink-0 flex flex-col border-t overflow-hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)', borderColor: 'rgba(255, 179, 0, 0.2)' }}>
        <div className="flex-1 grid grid-cols-12 gap-1 md:gap-4 px-1 md:px-4 py-1 md:py-2 overflow-hidden">
          <div className="col-span-12 md:col-span-8 flex flex-col h-full border-r pr-1 md:pr-4 overflow-hidden" style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}>
            <div className="flex justify-between items-center mb-0.5 md:mb-1">
              <span className="text-[8px] md:text-[10px] font-mono" style={{ color: '#ffffff' }}>VERACITY_LEDGER</span>
              <div className="flex gap-1 md:gap-4 text-[7px] md:text-[9px] font-mono hidden md:flex" style={{ color: '#636565' }}>
                <span className="cursor-pointer transition-colors hover:text-white">LATEST</span>
                <span className="cursor-pointer transition-colors hover:text-white">ERRORS</span>
                <span className="cursor-pointer transition-colors hover:text-white">SYNC</span>
              </div>
            </div>
            <div className="flex-1 font-mono text-[8px] md:text-[10px] space-y-0.5 md:space-y-1 overflow-y-auto pr-0.5 md:pr-2 scrollbar-thin" style={{ color: '#c4c7c8' }}>
              <div className="flex gap-1 md:gap-4">
                <span style={{ color: '#FFB300' }}>[AUDIT]</span>
                <span style={{ color: '#ffffff' }}>[ZK]</span>
                <span>dV: 0.880</span>
                <span className="ml-auto opacity-50">14:32</span>
              </div>
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 flex flex-col h-full justify-between">
            <div className="text-[8px] md:text-[10px] font-mono mb-0.5 md:mb-1" style={{ color: '#c4c7c8' }}>SOVEREIGN ARCHIVE</div>
            <div className="space-y-0.5 md:space-y-1">
              <div className="text-[8px] md:text-[10px] font-mono flex justify-between" style={{ color: '#636565' }}>
                <span>DB Lat:</span>
                <span style={{ color: '#ffffff' }}>22ms</span>
              </div>
              <div className="text-[8px] md:text-[10px] font-mono flex justify-between" style={{ color: '#636565' }}>
                <span>Backlog:</span>
                <span style={{ color: '#FFB300' }}>98%</span>
              </div>
              <div className="h-0.5 md:h-1 mt-0.5" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}>
                <div className="h-full" style={{ width: '98%', background: 'linear-gradient(to right, rgba(255, 179, 0, 0.2), #FFB300, #ffffff)' }}></div>
              </div>
            </div>
          </div>
        </div>
        <div className="h-5 md:h-8 flex justify-between items-center px-1 md:px-4 border-t" style={{ backgroundColor: '#000000', borderColor: 'rgba(255, 179, 0, 0.1)' }}>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full animate-pulse hidden md:inline" style={{ backgroundColor: '#FFB300' }}></span>
            <span className="text-[8px] md:text-[10px] font-mono" style={{ color: '#ffffff' }}>LEDGER</span>
          </div>
          <div className="font-mono text-[7px] md:text-[9px] tracking-[0.1em] hidden md:inline" style={{ color: '#636565' }}>
            KEY: 72A-D9K-X04
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