import { useHUDStore } from '../../state/stores/hudStore';
import { useNodeStore } from '../../state/stores/nodeStore';

export function SystemicSliders() {
  const temperature = useHUDStore((s) => s.temperature);
  const noiseFilter = useHUDStore((s) => s.noiseFilter);
  const setTemperature = useHUDStore((s) => s.setTemperature);
  const setNoiseFilter = useHUDStore((s) => s.setNoiseFilter);
  const flux = useNodeStore((s) => s.flux);
  const setFlux = useNodeStore((s) => s.setFlux);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-radiant-cream font-mono text-xs mb-2">
          Boltzmann Temperature (T<sub>s</sub>)
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full h-2 bg-dawn-obsidian rounded-lg appearance-none cursor-pointer accent-ultranetic-amber"
        />
        <div className="text-right text-white/40 font-mono text-xs mt-1">
          {temperature.toFixed(3)}
        </div>
      </div>

      <div>
        <label className="block text-radiant-cream font-mono text-xs mb-2">
          Noise Filter (Thermodynamic Flux)
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={noiseFilter}
          onChange={(e) => setNoiseFilter(parseFloat(e.target.value))}
          className="w-full h-2 bg-dawn-obsidian rounded-lg appearance-none cursor-pointer accent-ultranetic-amber"
        />
        <div className="text-right text-white/40 font-mono text-xs mt-1">
          {noiseFilter.toFixed(3)}
        </div>
      </div>

      <div>
        <label className="block text-radiant-cream font-mono text-xs mb-2">
          Resonance Flux (α)
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={flux}
          onChange={(e) => {
            const newFlux = parseFloat(e.target.value);
            setFlux(newFlux);
            console.log('[FLUX_UPDATE]', newFlux);
          }}
          className="w-full h-2 bg-dawn-obsidian rounded-lg appearance-none cursor-pointer accent-physical-rose"
        />
        <div className="text-right text-white/40 font-mono text-xs mt-1">
          {flux.toFixed(3)}
        </div>
      </div>

      <div className="text-white/30 font-mono text-xs mt-4 p-2 bg-white/5 rounded">
        <div>Entropy Rate: φ-exponential</div>
        <div>Confirmation: 7 prime-cycles</div>
        <div>Flux Baseline: 0.130</div>
      </div>
    </div>
  );
}