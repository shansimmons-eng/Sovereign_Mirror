import { useState } from 'react';
import Module1 from '../modules/Module1';
import Module2 from '../modules/Module2';
import Module3 from '../modules/Module3';
import Module4 from '../modules/Module4';
import Module5 from '../modules/Module5';
import Module6 from '../modules/Module6';
import Module7 from '../modules/Module7';
import Module8 from '../modules/Module8';
import Module9 from '../modules/Module9';

const MODULE_META: Record<string, { short: string; live: boolean }> = {
  '1': { short: 'INT. VERACITY',    live: true  },
  '2': { short: 'REL. INTEGRITY',   live: true  },
  '3': { short: 'ENV. STEWARDSHIP', live: false },
  '4': { short: 'TECH. FLUENCY',    live: false },
  '5': { short: 'PHYSIO. OPTIM.',   live: false },
  '6': { short: 'TEMPORAL DISC.',   live: false },
  '7': { short: 'CREATIVE SYNTH.',  live: false },
  '8': { short: 'COLLAB. GOV.',     live: false },
  '9': { short: 'FLOURISHING',      live: false },
};

const moduleMap: Record<string, () => JSX.Element> = {
  '1': Module1, '2': Module2, '3': Module3,
  '4': Module4, '5': Module5, '6': Module6,
  '7': Module7, '8': Module8, '9': Module9,
};

const BADGES_BASE = (): string =>
  (typeof window !== 'undefined' && window.kylosTraining?.badgesBase)
    ? window.kylosTraining.badgesBase
    : '/badges';

interface ModuleRouterProps {
  pillarId: string;
}

export function ModuleRouter({ pillarId }: ModuleRouterProps) {
  const [active, setActive] = useState(pillarId in moduleMap ? pillarId : '1');
  const Module = moduleMap[active] ?? Module1;

  return (
    <div className="kylos-shell">
      <nav className="module-nav" aria-label="Pillar navigation">
        {Object.entries(MODULE_META).map(([id, meta]) => (
          <button
            key={id}
            className={`nav-pill${active === id ? ' nav-pill--active' : ''}${!meta.live ? ' nav-pill--stub' : ''}`}
            onClick={() => setActive(id)}
            title={meta.live ? `Pillar ${id} — ${meta.short}` : `Pillar ${id} — ${meta.short} (in development)`}
          >
            <img
              src={`${BADGES_BASE()}/pillar${id}-badge.png`}
              alt={`Pillar ${id}`}
              className="nav-pill__badge-img"
              aria-hidden="true"
            />
            <span className="nav-pill__label">{meta.short}</span>
          </button>
        ))}
      </nav>

      <div className="module-loading-wrap">
        <Module />
      </div>
    </div>
  );
}
