import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchEcologyData, EcologyData } from '../../services/apiService';
import { logEcologyEvent } from '../../state/ledger/slices/ecologySlice';

const POLL_MS = 300_000; // 5 minutes, matching server cache

// Reference points must match server/index.js ECO_REFERENCE_POINTS
const REFERENCE_POINTS = [
  { id: 'arctic',   lat: 70,  lon: 0, label: 'ARCTIC',        sublabel: 'Greenland Sea' },
  { id: 'equator',  lat: 0,   lon: 0, label: 'EQUATORIAL',    sublabel: 'Gulf of Guinea' },
  { id: 'southern', lat: -60, lon: 0, label: 'SOUTHERN',      sublabel: 'Southern Ocean' },
];

// Equirectangular projection: maps lat/lon to SVG units
const W = 360;
const H = 180;
function project(lat: number, lon: number): { x: number; y: number } {
  return {
    x: lon + 180,
    y: 90 - lat,
  };
}

// Graticule lines at 30° intervals
const LAT_LINES = [-90, -60, -30, 0, 30, 60, 90];
const LON_LINES = [-180, -120, -60, 0, 60, 120, 180];

function ecoColor(health: number): string {
  if (health >= 0.7) return '#3FF4D5';  // cyan
  if (health >= 0.4) return '#F47B3F';  // orange
  return '#F43F5E';                      // rose
}

export function EcologyMap() {
  const dispatch = useDispatch();
  const [data, setData] = useState<EcologyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const result = await fetchEcologyData();
      if (cancelled) return;
      if (result.ok && result.data) {
        const d = result.data;
        setData(d);
        setLastUpdated(Date.now());
        setError(null);
        dispatch(logEcologyEvent({
          id: `eco-${Date.now()}`,
          eventType: d.ecoHealth < 0.4 ? 'ECO_THRESHOLD_BREACH' : 'ECO_READING_RECEIVED',
          ecoHealth: d.ecoHealth,
          temperatureAnomaly: d.temperatureAnomaly,
          timestamp: d.timestamp,
        }));
      } else {
        setError(result.error || 'fetch failed');
      }
      setLoading(false);
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [dispatch]);

  const health = data?.ecoHealth ?? 0;
  const anomaly = data?.temperatureAnomaly ?? 0;
  const color = ecoColor(health);
  const healthPct = Math.round(health * 100);
  const anomalySign = anomaly >= 0 ? '+' : '';

  return (
    <div className="font-mono text-radiant-cream mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }} />
          <span className="text-sm">PLANETARY ANCHOR</span>
        </div>
        {lastUpdated > 0 && (
          <span className="text-[9px] text-white/20">
            {new Date(lastUpdated).toISOString().slice(11, 16)} UTC
          </span>
        )}
      </div>

      {loading && !data && (
        <div className="text-white/30 text-xs italic">Fetching ecological data...</div>
      )}
      {error && (
        <div className="text-deprecated-rust text-[10px] mb-2">{error}</div>
      )}

      {/* Graticule map */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded border"
        style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.6)' }}
        aria-label="Equirectangular ecological reference map"
      >
        {/* Latitude grid lines */}
        {LAT_LINES.map(lat => {
          const y = project(lat, 0).y;
          const isEquator = lat === 0;
          return (
            <line
              key={`lat${lat}`}
              x1={0} y1={y} x2={W} y2={y}
              stroke={isEquator ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
              strokeWidth={isEquator ? 0.5 : 0.3}
            />
          );
        })}

        {/* Longitude grid lines */}
        {LON_LINES.map(lon => {
          const x = project(0, lon).x;
          const isPrimeMeridian = lon === 0;
          return (
            <line
              key={`lon${lon}`}
              x1={x} y1={0} x2={x} y2={H}
              stroke={isPrimeMeridian ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
              strokeWidth={isPrimeMeridian ? 0.5 : 0.3}
            />
          );
        })}

        {/* Latitude labels */}
        {[-60, -30, 0, 30, 60].map(lat => (
          <text
            key={`llabel${lat}`}
            x={2}
            y={project(lat, -180).y + 2.5}
            fill="rgba(255,255,255,0.2)"
            fontSize={5}
            fontFamily="monospace"
          >
            {lat >= 0 ? `${lat}N` : `${Math.abs(lat)}S`}
          </text>
        ))}

        {/* Data point markers */}
        {data && REFERENCE_POINTS.map(pt => {
          const { x, y } = project(pt.lat, pt.lon);
          return (
            <g key={pt.id}>
              {/* Outer pulse ring */}
              <circle cx={x} cy={y} r={6} fill="none" stroke={color} strokeWidth={0.5} opacity={0.3}>
                <animate attributeName="r" values="4;8;4" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.05;0.3" dur="3s" repeatCount="indefinite" />
              </circle>
              {/* Inner dot */}
              <circle cx={x} cy={y} r={2.5} fill={color} opacity={0.9} />
              {/* Crosshair lines */}
              <line x1={x - 5} y1={y} x2={x - 2.5} y2={y} stroke={color} strokeWidth={0.5} opacity={0.5} />
              <line x1={x + 2.5} y1={y} x2={x + 5} y2={y} stroke={color} strokeWidth={0.5} opacity={0.5} />
              <line x1={x} y1={y - 5} x2={x} y2={y - 2.5} stroke={color} strokeWidth={0.5} opacity={0.5} />
              <line x1={x} y1={y + 2.5} x2={x} y2={y + 5} stroke={color} strokeWidth={0.5} opacity={0.5} />
            </g>
          );
        })}

        {/* Prime meridian data-point callout lines */}
        {data && REFERENCE_POINTS.map((pt, i) => {
          const { x, y } = project(pt.lat, pt.lon);
          const labelX = W - 2;
          const labelY = 20 + i * 28;
          return (
            <g key={`label${pt.id}`}>
              <line
                x1={x} y1={y}
                x2={labelX - 60} y2={labelY}
                stroke={color} strokeWidth={0.3} strokeDasharray="2,2" opacity={0.3}
              />
              <text x={labelX} y={labelY - 2} fill={color} fontSize={4.5} fontFamily="monospace" textAnchor="end">{pt.label}</text>
              <text x={labelX} y={labelY + 4} fill="rgba(255,255,255,0.3)" fontSize={3.5} fontFamily="monospace" textAnchor="end">{pt.sublabel}</text>
            </g>
          );
        })}

        {/* ecoHealth bar at bottom */}
        <rect x={0} y={H - 4} width={W} height={4} fill="rgba(255,255,255,0.04)" />
        <rect x={0} y={H - 4} width={W * health} height={4} fill={color} opacity={0.7} />
      </svg>

      {/* Readout below map */}
      <div className="mt-2 grid grid-cols-2 gap-x-4 text-[10px]">
        <div>
          <span className="text-white/40">ECO HEALTH</span>
          <span className="ml-2" style={{ color }}>{healthPct}%</span>
        </div>
        <div>
          <span className="text-white/40">Δ TEMP</span>
          <span className="ml-2" style={{ color }}>
            {anomalySign}{anomaly.toFixed(2)}°C
          </span>
        </div>
        <div className="col-span-2 mt-1 text-white/20 text-[9px]">
          3-pt weighted · baseline 1850-1900 · Open-Meteo
        </div>
      </div>
    </div>
  );
}
