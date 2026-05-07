import { createServer } from 'node:http';
import { veracityGate, calculateQuorum, calculateAtrophyDecay, getThresholdWithEntropy } from './logic/kernel.js';

const PORT = 3001;

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'TRUSTED_KERNEL_ONLINE', timestamp: Date.now() }));
    return;
  }

  if (url.pathname === '/api/pgate/engage' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { mode, level } = JSON.parse(body);

        if (!mode || typeof level !== 'number') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'mode and level are required' }));
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
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { active, control } = JSON.parse(body);
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
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { activeNodes, affirmingNodes } = JSON.parse(body);
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
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { virtualResonance, elapsedMs } = JSON.parse(body);
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
  console.log(`  GET  /api/health`);
  console.log(`  POST /api/pgate/engage`);
  console.log(`  POST /api/veracity/calculate`);
  console.log(`  POST /api/quorum/calculate`);
  console.log(`  POST /api/atrophy/calculate`);
  console.log(`  GET  /api/kernel/version`);
});