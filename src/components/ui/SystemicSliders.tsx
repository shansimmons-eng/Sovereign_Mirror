import { useHUDStore } from '../../state/stores/hudStore';
import { useNodeStore } from '../../state/stores/nodeStore';

export function SystemicSliders() {
  const temperature = useHUDStore((s) => s.temperature);
  const noiseFilter = useHUDStore((s) => s.noiseFilter);
  const flux = useNodeStore((s) => s.flux);

  const setTemperature = useHUDStore((s) => s.setTemperature);
  const setNoiseFilter = useHUDStore((s) => s.setNoiseFilter);
  const setFlux = useNodeStore((s) => s.setFlux);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="font-data-mono text-[10px] text-on-surface-variant block uppercase">
          Boltzmann Temperature (Ts)
        </label>
        <div className="relative h-1 w-full bg-white/10">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer"
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-ignition-white border border-solar-amber rotate-45 pointer-events-none"
            style={{ left: `${temperature * 100}%` }}
          />
          <div className="h-full bg-solar-amber" style={{ width: `${temperature * 100}%` }} />
        </div>
        <div className="text-right font-data-mono text-[10px] text-on-surface-variant">
          {(temperature * 100).toFixed(1)}%
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-data-mono text-[10px] text-on-surface-variant block uppercase">
          Boltzmann Noise (bn)
        </label>
        <div className="relative h-1 w-full bg-white/10">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={noiseFilter}
            onChange={(e) => setNoiseFilter(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer"
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-ignition-white border border-solar-amber rotate-45 pointer-events-none"
            style={{ left: `${noiseFilter * 100}%` }}
          />
          <div className="h-full bg-solar-amber" style={{ width: `${noiseFilter * 100}%` }} />
        </div>
        <div className="text-right font-data-mono text-[10px] text-on-surface-variant">
          {(noiseFilter * 100).toFixed(1)}%
        </div>
      </div>

      <div className="space-y-2">
        <label className="font-data-mono text-[10px] text-on-surface-variant block uppercase">
          Inverion Alpha (α)
        </label>
        <div className="relative h-1 w-full bg-white/10">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={flux}
            onChange={(e) => setFlux(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-1 opacity-0 cursor-pointer"
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-ignition-white border border-solar-amber rotate-45 pointer-events-none"
            style={{ left: `${flux * 100}%` }}
          />
          <div className="h-full bg-solar-amber" style={{ width: `${flux * 100}%` }} />
        </div>
        <div className="text-right font-data-mono text-[10px] text-on-surface-variant">
          {flux.toFixed(3)}
        </div>
      </div>
    </div>
  );
}