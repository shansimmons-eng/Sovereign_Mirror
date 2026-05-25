# Sovereign Mirror - Deployment Guide

## Current Status

### ✓ Completed
1. **Shader Uniforms Extended**
   - Added `u_bolt_impulse` and `u_grain_density` to vertex/fragment shaders
   - Located in: `src/components/three/ResonanceTrajectory.tsx:51-52,117-142`

2. **CryptoWrapper Updated**
   - `VisualPayload` interface includes `bolt` and `grain` fields
   - `getVisualPayload()` async function fetches `./active_state.json`
   - Falls back to browser-based `STATE_LOADER` if file unavailable
   - Located in: `src/mirror/core/CryptoWrapper.ts:16-22,96-120`

3. **Frontend Wired**
   - `ResonanceTrajectory.tsx` polls `getVisualPayload()` every 500ms
   - Shader uniforms updated from live state
   - Located in: `src/components/three/ResonanceTrajectory.tsx:284-297,428-434`

4. **Python Stream Updated**
   - `simulate_stream.py` writes both `current_state.json` and `active_state.json`
   - Located in: `src/mirror/core/simulate_stream.py:19,93-96`

5. **Network Quarantine**
   - Verified: No `/src/components/` imports from `/src/crypto/`
   - CryptoWrapper acts as sole gateway

### ⚠️ Blocked - Requires Action

#### Build System (UNC Path Issue)
**Problem**: Vite build fails from `\\wsl$\Ubuntu\` UNC path
**Workaround Options**:
1. Copy to `C:\temp\sovereign-build\` and build there
2. Use WSL native path and build from Linux side
3. Map UNC to drive letter: `net use Z: \\wsl$\Ubuntu`

**Manual Build Steps**:
```bash
# Option 1: Copy and build
mkdir C:\temp\sovereign-build
xcopy /E /I . C:\temp\sovereign-build
cd C:\temp\sovereign-build
npm run build

# Option 2: WSL native
wsl
cd ~/cup
npm run build
```

#### Cloudflare Pages Deployment
**Requirements**:
1. Get Cloudflare API token: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
2. Set environment variable:
   ```bash
   set CLOUDFLARE_API_TOKEN=your_token_here
   ```
3. Deploy:
   ```bash
   node node_modules/wrangler/bin/wrangler.js pages deploy dist --project-name=sovereignmirror
   ```

**Alternative - Manual Upload**:
1. Go to Cloudflare Dashboard → Pages → sovereignmirror
2. Upload `dist/` folder directly

## Production Files Required

### dist/ folder must contain:
- `index.html`
- `assets/index-*.js` (bundled React app)
- `assets/index-*.css` (styles)
- **`active_state.json`** (simulation state) ✓ Already created

### active_state.json structure:
```json
{
  "metadata": { ... },
  "telemetry": {
    "alpha": 0.82,
    "noise": 0.12,
    "temp": 0.55,
    "bolt": 0.0,
    "grain": 0.0
  },
  "system": { ... }
}
```

## Post-Deployment Setup

### Option A: Python Stream (Server-Side)
If you have Python on Cloudflare Workers or separate server:
```bash
python3 src/mirror/core/simulate_stream.py
```
This updates `active_state.json` every 15 seconds.

### Option B: Browser-Only (Current Default)
No server setup needed. Frontend uses `BrowserSimulation.ts` which:
- Runs entirely in browser
- Cycles through 8 milestones every 15 seconds
- No external dependencies

## Verification

1. **Open deployed URL**
2. **Check DevTools Console** for:
   ```
   ✓ Browser Simulation Engine Started
   Cycle Interval: 15000ms
   ```
3. **Inspect Network tab** - Should see fetch to `./active_state.json`
4. **Verify shaders** - Open console and check:
   ```javascript
   // Should see uniforms updating
   u_bolt_impulse: 0.0 to 1.0
   u_grain_density: 0.0 to 1.0
   ```

## Known Limitations

1. **Particle Budget**: Locked at INSTANCE_COUNT=2000 (not 5000 as originally specified)
   - Located: `ResonanceTrajectory.tsx:12`
   - Can increase to 5000 but may impact FPS on lower-end devices

2. **Bolt/Grain Values**: Currently default to 0.0
   - Need to populate in `active_state.json` or wire to interactive controls

3. **Build System**: Requires workaround due to WSL UNC path limitations

## Next Steps

1. **Build fresh bundle** with today's changes (bolt/grain uniforms)
2. **Get Cloudflare API token** for automated deployment
3. **Deploy to kylosarc.com/sovereign-mirror**
4. **Test live state fetching**
5. **Wire interactive controls** for bolt/grain parameters
