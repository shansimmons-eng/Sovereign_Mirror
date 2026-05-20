import { createServer } from 'node:http';
import { veracityGate, calculateQuorum, calculateAtrophyDecay, getThresholdWithEntropy } from './logic/kernel.js';

const PORT = 3001;
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://kylosarc.org',
  'https://www.kylosarc.org',
];
const MAX_BODY_SIZE = 4096;
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 100;
const REQUEST_TIMEOUT_MS = 30000; // 30 second timeout for slow loris protection
const requestCounts = new Map();

// Security headers for all responses
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

const PLASMA_URL = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json';
const MAGNET_URL = 'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json';
const RTSW_CACHE_TTL_MS = 30000;
let _rtswCache = null;
let _rtswCacheTime = 0;

function getSafe(val, fallback) {
  const v = Number(val);
  return (v !== null && v !== undefined && isFinite(v) && v > -900) ? v : fallback;
}

async function fetchRTSWFromNOAA() {
  try {
    const [plasmaRes, magRes] = await Promise.all([
      fetch(PLASMA_URL, { headers: { 'User-Agent': 'SovereignMirror/1.0' }, signal: AbortSignal.timeout(8000) }),
      fetch(MAGNET_URL, { headers: { 'User-Agent': 'SovereignMirror/1.0' }, signal: AbortSignal.timeout(8000) })
    ]);
    if (!plasmaRes.ok || !magRes.ok) throw new Error('NOAA fetch failed');
    const [plasma, mag] = await Promise.all([plasmaRes.json(), magRes.json()]);
    const lp = plasma[plasma.length - 1] || {};
    const lm = mag[mag.length - 1] || {};
    return {
      speed: getSafe(lp.speed, 400),
      density: getSafe(lp.density, 10),
      temperature: getSafe(lp.temperature, 100000),
      bx: getSafe(lm.bx, 0),
      by: getSafe(lm.by, 0),
      bz: getSafe(lm.bz, 0),
      bt: getSafe(lm.bt, 0),
      timestamp: Date.now(),
      source: 'NOAA SWPC',
    };
  } catch (e) {
    return null;
  }
}

async function getRTSW() {
  const now = Date.now();
  if (_rtswCache && now - _rtswCacheTime < RTSW_CACHE_TTL_MS) {
    return _rtswCache;
  }
  const data = await fetchRTSWFromNOAA();
  if (data) {
    _rtswCache = data;
    _rtswCacheTime = now;
  }
  return _rtswCache;
}

function getRateLimitKey(req) {
  return req.socket.remoteAddress || 'unknown';
}

function isRateLimited(key) {
  const now = Date.now();
  const entry = requestCounts.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    requestCounts.set(key, { windowStart: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically clean up expired rate limit entries to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCounts.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      requestCounts.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

function getCorsOrigin(req) {
  const origin = req.headers.origin;
  // Only return origin if it's in the allowed list; return null for unknown origins
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return null; // Reject unknown origins instead of defaulting
}

function validateNumber(value, name) {
  if (typeof value !== 'number' || !isFinite(value)) {
    return `${name} must be a finite number`;
  }
  return null;
}

const VALID_MODES = new Set(['resonance', 'refining', 'virtual']);

const server = createServer(async (req, res) => {
  // Set request timeout to prevent slow loris attacks
  req.setTimeout(REQUEST_TIMEOUT_MS, () => {
    res.writeHead(408, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Request timeout' }));
    req.destroy();
  });

  // Apply security headers to all responses
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(header, value);
  }

  const origin = getCorsOrigin(req);
  
  // Only set CORS headers if origin is allowed
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    if (!origin) {
      // Reject preflight from unknown origins
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Origin not allowed' }));
      return;
    }
    res.writeHead(204);
    res.end();
    return;
  }

  const rateLimitKey = getRateLimitKey(req);
  if (isRateLimited(rateLimitKey)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Too many requests' }));
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'TRUSTED_KERNEL_ONLINE', timestamp: Date.now() }));
    return;
  }

  if (url.pathname === '/api/rtsw/latest' && req.method === 'GET') {
    const rtsw = await getRTSW();
    if (rtsw) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(rtsw));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'NOAA unavailable' }));
    }
    return;
  }

  if (url.pathname === '/api/pgate/engage' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      try {
        const { mode, level } = JSON.parse(body);

        if (!mode || typeof mode !== 'string' || !VALID_MODES.has(mode)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'mode must be a non-empty string matching: resonance, refining, virtual' }));
          return;
        }

        const levelErr = validateNumber(level, 'level');
        if (levelErr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: levelErr }));
          return;
        }

        const threshold = getThresholdWithEntropy();
        const canEngage = level >= threshold;

        const engagement = {
          mode,
          level,
          threshold,
          canEngage,
          status: canEngage ? 'ENGAGED' : 'BLOCKED',
          message: canEngage
            ? `P-Gate engaged at resonance level ${level.toFixed(3)}`
            : `Resonance level ${level.toFixed(3)} below threshold ${threshold.toFixed(3)}`,
          timestamp: Date.now()
        };

        console.log(`[PGATE] ${engagement.status} - ${engagement.message}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(engagement));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/veracity/calculate' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      try {
        const { active, control } = JSON.parse(body);
        const activeErr = validateNumber(active, 'active');
        const controlErr = validateNumber(control, 'control');
        if (activeErr || controlErr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: activeErr || controlErr }));
          return;
        }
        const result = veracityGate(active, control);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ veracity: result, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/quorum/calculate' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      try {
        const { activeNodes, affirmingNodes } = JSON.parse(body);
        const nodesErr = validateNumber(activeNodes, 'activeNodes');
        if (nodesErr || activeNodes < 1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: nodesErr || 'activeNodes must be >= 1' }));
          return;
        }
        if (affirmingNodes !== undefined) {
          const affErr = validateNumber(affirmingNodes, 'affirmingNodes');
          if (affErr) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: affErr }));
            return;
          }
        }
        const quorum = calculateQuorum(activeNodes);
        const reached = affirmingNodes !== undefined ? affirmingNodes >= quorum : null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ quorum, reached, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/atrophy/calculate' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      try {
        const { virtualResonance, elapsedMs } = JSON.parse(body);
        const vrErr = validateNumber(virtualResonance, 'virtualResonance');
        const msErr = validateNumber(elapsedMs, 'elapsedMs');
        if (vrErr || msErr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: vrErr || msErr }));
          return;
        }
        const result = calculateAtrophyDecay(virtualResonance, elapsedMs);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ atrophied: result, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/kernel/version' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      version: '1.0.0',
      build: 'TRUSTED_KERNEL',
      commit: 'SOVEREIGN_MIRROR_PHASE_7',
      timestamp: Date.now()
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`[TRUSTED_KERNEL] Server running on port ${PORT}`);
  console.log(`[TRUSTED_KERNEL] Using Node.js built-in HTTP (no express needed)`);
  console.log(`  GET  /api/rtsw/latest`);
  console.log(`  GET  /api/health`);
  console.log(`  POST /api/pgate/engage`);
  console.log(`  POST /api/veracity/calculate`);
  console.log(`  POST /api/quorum/calculate`);
  console.log(`  POST /api/atrophy/calculate`);
  console.log(`  GET  /api/kernel/version`);
});