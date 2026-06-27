import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { veracityGate, calculateQuorum, calculateAtrophyDecay, getThresholdWithEntropy } from './logic/kernel.js';
import { getAllWeights, recordFeedback, applyVerdict, getRecentFeedback, recordAnalysis, getRecentAnalyses } from './feedbackStore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CRYPTO_BIN = process.env.CRYPTO_SERVER_BIN || 'wsl.exe';
let CRYPTO_ARGS;
try {
  CRYPTO_ARGS = process.env.CRYPTO_SERVER_ARGS
    ? JSON.parse(process.env.CRYPTO_SERVER_ARGS)
    : ['/home/retroporter/cup/kylos-qpadl/target/release/kylos-crypto-server'];
} catch {
  CRYPTO_ARGS = ['/home/retroporter/cup/kylos-qpadl/target/release/kylos-crypto-server'];
}
if (!Array.isArray(CRYPTO_ARGS) || CRYPTO_ARGS.length === 0) {
  CRYPTO_ARGS = ['/home/retroporter/cup/kylos-qpadl/target/release/kylos-crypto-server'];
}
const CRYPTO_MAX_RESTARTS = 5;
let cryptoProc = null;
let cryptoReady = false;
let cryptoReqId = 1;
let cryptoPending = new Map();
const CRYPTO_PENDING_MAX = 256;
let cryptoRestartCount = 0;

function startCryptoServer() {
  if (cryptoRestartCount >= CRYPTO_MAX_RESTARTS) {
    console.error('[CRYPTO] Max restarts reached, giving up');
    cryptoReady = false;
    return;
  }

  cryptoProc = spawn(CRYPTO_BIN, CRYPTO_ARGS, {
    stdio: ['pipe', 'pipe', 'inherit'],
    windowsHide: true,
  });

  cryptoRestartCount++;

  const rl = createInterface({ input: cryptoProc.stdout });
  rl.on('line', (line) => {
    try {
      const msg = JSON.parse(line);
      const id = msg.id;
      if (id != null && cryptoPending.has(id)) {
        const { resolve } = cryptoPending.get(id);
        cryptoPending.delete(id);
        resolve(msg);
      }
    } catch { /* ignore malformed lines */ }
  });

  cryptoProc.on('error', (err) => {
    console.error('[CRYPTO] Server error:', err.message);
    cryptoReady = false;
  });

  cryptoProc.on('exit', (code) => {
    console.error(`[CRYPTO] Server exited (${code}), restarting in 2s`);
    cryptoReady = false;
    cryptoPending.forEach(({ reject }) => reject(new Error('crypto server exited')));
    cryptoPending.clear();
    setTimeout(startCryptoServer, 2000);
  });

  cryptoReady = true;
}

function sendCryptoRequest(method, params) {
  return new Promise((resolve, reject) => {
    if (!cryptoProc || !cryptoProc.stdin.writable) {
      reject(new Error('crypto server not available'));
      return;
    }
    if (cryptoPending.size >= CRYPTO_PENDING_MAX) {
      reject(new Error('crypto server overloaded'));
      return;
    }
    const id = cryptoReqId++;
    cryptoPending.set(id, { resolve, reject });
    const request = JSON.stringify({ id, method, params }) + '\n';
    cryptoProc.stdin.write(request);
    setTimeout(() => {
      if (cryptoPending.has(id)) {
        cryptoPending.delete(id);
        reject(new Error('crypto request timeout'));
      }
    }, 30000);
  });
}

startCryptoServer();

const PORT = 3001;
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://kylosarc.org',
  'https://www.kylosarc.org',
  'http://178.156.135.222',
  'http://178.156.135.222:80',
];
const MAX_BODY_SIZE = 4096;
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX = 5000;
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

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OR_MODEL_1 = 'meta-llama/llama-3.3-70b-instruct:free';
const OR_MODEL_2 = 'qwen/qwen3-next-80b-a3b-instruct:free';
const VALIDATE_TIMEOUT_MS = 15000;
const FALLACY_SYSTEM_PROMPT = `You are a logical fallacy detection expert. Analyze the statement and determine if it contains a logical fallacy.

Supported fallacies:
- ad_hominem
- false_dilemma
- appeal_to_emotion
- false_causality
- circular_reasoning
- hasty_generalization
- strawman
- slippery_slope

Respond ONLY with valid JSON:
{"detected": true/false, "fallacy_type": "type or null", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`;

function getOpenRouterKey() {
  return process.env.OPENROUTER_API_KEY || process.env.FREE_OPENROUTER || process.env.GEN_OPENROUTER || null;
}

async function queryOR(text, modelId, apiKey) {
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://kylosarc.org',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: FALLACY_SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        max_tokens: 500,
        temperature: 0.1,
        stream: false,
      }),
      signal: AbortSignal.timeout(VALIDATE_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[VALIDATE] ${modelId} returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content);
    return {
      detected: !!parsed.detected,
      fallacy_type: parsed.fallacy_type || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
      reasoning: parsed.reasoning || '',
      model: modelId,
    };
  } catch (e) {
    console.warn(`[VALIDATE] ${modelId} error: ${e.message}`);
    return null;
  }
}

const FALLACY_DATA_PATH = join(__dirname, '..', 'fallacy_data.json');
let _fallacyDatasetCache = null;

function loadFallacyDataset() {
  if (_fallacyDatasetCache) return _fallacyDatasetCache;
  if (!existsSync(FALLACY_DATA_PATH)) {
    console.warn('[FALLACY] fallacy_data.json not found at', FALLACY_DATA_PATH);
    return { entries: [], by_type: {}, total: 0, sources: [] };
  }
  try {
    const raw = readFileSync(FALLACY_DATA_PATH, 'utf-8');
    const data = JSON.parse(raw);
    const entries = data.entries || [];
    const by_type = {};
    const sources = [];
    const seenSources = new Set();
    for (const entry of entries) {
      const t = entry.fallacy_type;
      if (!by_type[t]) by_type[t] = [];
      by_type[t].push(entry);
      if (entry.source && !seenSources.has(entry.source)) {
        seenSources.add(entry.source);
        sources.push(entry.source);
      }
    }
    _fallacyDatasetCache = { entries, by_type, total: entries.length, sources };
    console.log(`[FALLACY] Loaded ${entries.length} entries (${Object.keys(by_type).length} types, ${sources.length} sources)`);
    return _fallacyDatasetCache;
  } catch (e) {
    console.error('[FALLACY] Failed to load fallacy_data.json:', e.message);
    return { entries: [], by_type: {}, total: 0, sources: [] };
  }
}

const PLASMA_URL = process.env.NOAA_PLASMA_URL || 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json';
const MAGNET_URL = process.env.NOAA_MAGNET_URL || 'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json';
const RTSW_CACHE_TTL_MS = 30000;

const ECO_API_BASE = process.env.ECO_API_URL || 'https://api.open-meteo.com/v1/forecast';
const ECO_CACHE_TTL_MS = 300000; // 5 minutes — climate signal changes slowly
const ECO_TIMEOUT_MS = 8000;
// Three latitudinal reference points; Arctic and Antarctic weighted 2x (amplified warming signal)
// Baseline: pre-industrial 1850-1900 approximation, derived by subtracting IPCC AR6 zone warming
// offsets from 1991-2020 ERA5 ocean surface means (Arctic -2.0°C, Equatorial -0.7°C, Southern -1.0°C)
// This anchors the anomaly to the honest pre-industrial floor rather than the already-warmed WMO normal
const ECO_REFERENCE_POINTS = [
  {
    lat: 70, lon: 0, weight: 2, // Greenland Sea (Arctic ocean)
    // 1991-2020: [-5,-6,-5,-2,2,5,8,8,4,0,-3,-4] minus 2.0°C Arctic amplification offset
    monthlyNormals: [-7, -8, -7, -4, 0, 3, 6, 6, 2, -2, -5, -6],
  },
  {
    lat: 0, lon: 0, weight: 1, // Gulf of Guinea (equatorial Atlantic)
    // 1991-2020: [26,26.5,26.5,26,25.5,24.5,23.5,23,23.5,24.5,25.5,25.5] minus 0.7°C tropical offset
    monthlyNormals: [25.3, 25.8, 25.8, 25.3, 24.8, 23.8, 22.8, 22.3, 22.8, 23.8, 24.8, 24.8],
  },
  {
    lat: -60, lon: 0, weight: 2, // Southern Ocean (60°S — ocean, not ice sheet)
    // 1991-2020: [1,0,-2,-4,-6,-7,-8,-8,-6,-4,-1,0] minus 1.0°C Southern Ocean offset
    monthlyNormals: [0.0, -1.0, -3.0, -5.0, -7.0, -8.0, -9.0, -9.0, -7.0, -5.0, -2.0, -1.0],
  },
];
const ECO_MAX_ANOMALY_C = 6.0; // +6°C above pre-industrial normal → ecoHealth = 0
let _ecoCache = null;
let _ecoCacheTime = 0;

async function fetchEcologyPoint(lat, lon) {
  const url = `${ECO_API_BASE}?latitude=${lat}&longitude=${lon}&daily=temperature_2m_mean&temperature_unit=celsius&timezone=UTC&past_days=7&forecast_days=0`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SovereignMirror/1.0' },
    signal: AbortSignal.timeout(ECO_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const data = await res.json();
  const temps = (data.daily?.temperature_2m_mean || []).filter(t => t != null);
  if (!temps.length) throw new Error('no temperature data');
  return temps.reduce((a, b) => a + b, 0) / temps.length;
}

async function fetchEcologyData() {
  const results = await Promise.all(
    ECO_REFERENCE_POINTS.map(p => fetchEcologyPoint(p.lat, p.lon))
  );
  const month = new Date().getMonth(); // 0-11
  let totalWeight = 0;
  let weightedAnomalySum = 0;
  ECO_REFERENCE_POINTS.forEach((ref, i) => {
    const anomaly = results[i] - ref.monthlyNormals[month];
    weightedAnomalySum += anomaly * ref.weight;
    totalWeight += ref.weight;
  });
  const temperatureAnomaly = weightedAnomalySum / totalWeight;
  const ecoHealth = Math.max(0, Math.min(1, 1 - temperatureAnomaly / ECO_MAX_ANOMALY_C));
  return {
    ecoHealth,
    temperatureAnomaly: Math.round(temperatureAnomaly * 100) / 100,
    source: 'Open-Meteo · baseline 1850-1900 (IPCC AR6)',
    timestamp: Date.now(),
  };
}

async function getEcology() {
  const now = Date.now();
  if (_ecoCache && now - _ecoCacheTime < ECO_CACHE_TTL_MS) return _ecoCache;
  try {
    const data = await fetchEcologyData();
    _ecoCache = data;
    _ecoCacheTime = now;
  } catch (e) {
    console.warn('[ECO] Fetch failed:', e.message);
  }
  return _ecoCache;
}
let _rtswCache = null;
let _rtswCacheTime = 0;

function getSafe(val, fallback) {
  const v = Number(val);
  return (v !== null && v !== undefined && isFinite(v) && v > -900) ? v : fallback;
}

// NOAA SWPC switched to array-of-arrays format: [[headers], [row], ...]
// This normalises both formats (objects or arrays) to a plain named-property object.
function parseNOAARow(data) {
  if (!Array.isArray(data) || data.length < 2) return null;
  const last = data[data.length - 1];
  if (!last) return null;
  if (!Array.isArray(last)) return last; // already an object-per-row format
  const headers = data[0];
  if (!Array.isArray(headers) || headers.length !== last.length) return null;
  const obj = {};
  headers.forEach((key, i) => { obj[key] = last[i]; });
  return obj;
}

async function fetchRTSWFromNOAA() {
  try {
    const [plasmaRes, magRes] = await Promise.all([
      fetch(PLASMA_URL, { headers: { 'User-Agent': 'SovereignMirror/1.0' }, signal: AbortSignal.timeout(8000) }),
      fetch(MAGNET_URL, { headers: { 'User-Agent': 'SovereignMirror/1.0' }, signal: AbortSignal.timeout(8000) })
    ]);
    if (!plasmaRes.ok || !magRes.ok) throw new Error(`NOAA HTTP ${plasmaRes.status}/${magRes.status}`);
    const [plasma, mag] = await Promise.all([plasmaRes.json(), magRes.json()]);
    const lp = parseNOAARow(plasma);
    const lm = parseNOAARow(mag);
    if (!lp || !lm) throw new Error('NOAA response schema unrecognised');
    // NOAA uses bx_gsm/by_gsm/bz_gsm; fall back to bx_gse/by_gse/bz_gse or plain bx/by/bz
    return {
      speed: getSafe(lp.speed ?? lp.bulk_speed, 400),
      density: getSafe(lp.density ?? lp.proton_density, 10),
      temperature: getSafe(lp.temperature ?? lp.ion_temperature, 100000),
      bx: getSafe(lm.bx_gsm ?? lm.bx_gse ?? lm.bx, 0),
      by: getSafe(lm.by_gsm ?? lm.by_gse ?? lm.by, 0),
      bz: getSafe(lm.bz_gsm ?? lm.bz_gse ?? lm.bz, 0),
      bt: getSafe(lm.bt, 0),
      timestamp: Date.now(),
      source: 'NOAA SWPC',
    };
  } catch (e) {
    console.warn('[RTSW] fetch failed, will serve stale cache:', e.message);
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
  const ip = req.socket.remoteAddress || 'unknown';
  return `${ip}|${req.url?.split('?')[0] ?? ''}`;
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

  if (url.pathname === '/classify/fallacy-data' && req.method === 'GET') {
    const dataset = loadFallacyDataset();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(dataset));
    return;
  }

  if (url.pathname === '/validate' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', async () => {
      if (req.destroyed) return;
      try {
        const { text } = JSON.parse(body);
        if (!text || typeof text !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'text must be a non-empty string' }));
          return;
        }
        const apiKey = getOpenRouterKey();
        if (!apiKey) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No OpenRouter API key configured' }));
          return;
        }
        const [r1, r2] = await Promise.all([
          queryOR(text, OR_MODEL_1, apiKey),
          queryOR(text, OR_MODEL_2, apiKey),
        ]);
        const results = [r1, r2].filter(Boolean);
        const detectedCount = results.filter(r => r.detected).length;
        const avgConfidence = results.length > 0
          ? results.reduce((s, r) => s + r.confidence, 0) / results.length
          : 0;
        const consensus = {
          detected: detectedCount > 0,
          agents_detected: detectedCount,
          agents_queried: 2,
          reasoning: results.map(r => `${r.model}: ${r.reasoning}`).join(' | '),
        };
        const agents = {
          openrouter: results.map(r => ({
            detected: r.detected,
            confidence: r.confidence,
            reasoning: r.reasoning,
            model: r.model,
          })),
        };
        console.log(`[VALIDATE] "${text.substring(0, 50)}..." detected=${consensus.detected} (${detectedCount}/2)`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text, consensus, agents }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
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

  if (url.pathname === '/api/ecology/latest' && req.method === 'GET') {
    const eco = await getEcology();
    if (eco) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(eco));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Ecology data unavailable' }));
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
      if (req.destroyed) return;
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
      if (req.destroyed) return;
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
      if (req.destroyed) return;
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
      if (req.destroyed) return;
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

  if (url.pathname === '/api/feedback/weights' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ weights: getAllWeights(), timestamp: Date.now() }));
    return;
  }

  if (url.pathname === '/api/feedback' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE * 4) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      if (req.destroyed) return;
      try {
        const { statementId, fallacyId, text, verdict, agentScores } = JSON.parse(body);
        if (!verdict || !['correct', 'incorrect'].includes(verdict)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'verdict must be "correct" or "incorrect"' }));
          return;
        }
        const before = getAllWeights();
        const after = applyVerdict({ verdict, agentScores: agentScores || {} });
        recordFeedback({ statementId, fallacyId, text, verdict, agentScores, weightBefore: before, weightAfter: after });
        console.log(`[FEEDBACK] ${verdict} on ${fallacyId || statementId} | weights: ${Object.entries(after).map(([k,v]) => `${k}=${v.weight.toFixed(2)}`).join(', ')}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, weights: after, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/feedback/history' && req.method === 'GET') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 500);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ events: getRecentFeedback(limit), timestamp: Date.now() }));
    return;
  }

  if (url.pathname === '/api/feedback/analyze' && req.method === 'POST') {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE * 8) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      if (req.destroyed) return;
      try {
        const payload = JSON.parse(body);
        recordAnalysis(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  if (url.pathname === '/api/feedback/analyses' && req.method === 'GET') {
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 500);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ events: getRecentAnalyses(limit), timestamp: Date.now() }));
    return;
  }

  // --- QPADL Crypto endpoints ---

  function getCryptoResult(result) {
    if (!result || result.error) throw new Error((result && result.error) || 'crypto server error');
    if (!result.result) throw new Error('crypto server returned empty result');
    return result.result;
  }

  if (url.pathname === '/api/crypto/status' && req.method === 'GET') {
    try {
      const result = await sendCryptoRequest('status', {});
      const r = getCryptoResult(result);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ algorithms: r.algorithms, timestamp: Date.now() }));
    } catch (e) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  function readCryptoBody(req, onBody, onError) {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) { req.destroy(); return; }
      body += chunk;
    });
    req.on('end', () => {
      if (req.destroyed) return;
      try { onBody(JSON.parse(body)); }
      catch { onError('Invalid JSON'); }
    });
  }

  if (url.pathname === '/api/crypto/keypair' && req.method === 'POST') {
    readCryptoBody(req, async (json) => {
      try {
        const result = await sendCryptoRequest('keypair', { algorithm: json.algorithm || 'mayo1' });
        const r = getCryptoResult(result);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...r, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    }, (err) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err }));
    });
    return;
  }

  if (url.pathname === '/api/crypto/sign' && req.method === 'POST') {
    readCryptoBody(req, async (json) => {
      try {
        if (!json.message || !json.secret_key) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'message and secret_key required' }));
          return;
        }
        const result = await sendCryptoRequest('sign', {
          algorithm: json.algorithm || 'mayo1',
          message: json.message,
          secret_key: json.secret_key,
        });
        const r = getCryptoResult(result);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ...r, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    }, (err) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err }));
    });
    return;
  }

  if (url.pathname === '/api/crypto/verify' && req.method === 'POST') {
    readCryptoBody(req, async (json) => {
      try {
        if (!json.message || !json.signature || !json.public_key) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'message, signature, and public_key required' }));
          return;
        }
        const result = await sendCryptoRequest('verify', {
          algorithm: json.algorithm || 'mayo1',
          message: json.message,
          signature: json.signature,
          public_key: json.public_key,
        });
        const r = getCryptoResult(result);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: r.valid, timestamp: Date.now() }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    }, (err) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err }));
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

function shutdown() {
  console.log('[TRUSTED_KERNEL] Shutting down...');
  if (cryptoProc) {
    cryptoProc.removeAllListeners('exit');
    cryptoProc.stdin.end();
    const timeout = setTimeout(() => cryptoProc.kill(), 3000);
    cryptoProc.on('exit', () => clearTimeout(timeout));
  }
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => {
  console.log(`[TRUSTED_KERNEL] Server running on port ${PORT}`);
  console.log(`[TRUSTED_KERNEL] Using Node.js built-in HTTP (no express needed)`);
  console.log(`  GET  /api/rtsw/latest`);
  console.log(`  GET  /classify/fallacy-data`);
  console.log(`  GET  /api/health`);
  console.log(`  POST /validate`);
  console.log(`  POST /api/pgate/engage`);
  console.log(`  POST /api/veracity/calculate`);
  console.log(`  POST /api/quorum/calculate`);
  console.log(`  POST /api/atrophy/calculate`);
  console.log(`  GET  /api/kernel/version`);
  console.log(`  GET  /api/feedback/weights`);
  console.log(`  POST /api/feedback`);
  console.log(`  GET  /api/feedback/history`);
  console.log(`  POST /api/feedback/analyze`);
  console.log(`  GET  /api/feedback/analyses`);
  console.log(`  GET  /api/crypto/status`);
  console.log(`  POST /api/crypto/keypair`);
  console.log(`  POST /api/crypto/sign`);
  console.log(`  POST /api/crypto/verify`);
});