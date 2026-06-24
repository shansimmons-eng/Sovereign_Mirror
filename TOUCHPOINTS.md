# Sovereign Mirror — Attack Surface & Touchpoint Inventory

## 1. Remote Touchpoints (external network)

| # | Touchpoint | Direction | Protocol | Security | Config |
|---|------------|-----------|----------|----------|--------|
| 1 | **NOAA SWPC plasma-7-day** | Express → external | HTTPS GET | 8s timeout, `getSafe()` NaN guard, schema validation (array+object check) | `NOAA_PLASMA_URL` env |
| 2 | **NOAA SWPC mag-7-day** | Express → external | HTTPS GET | Same as above | `NOAA_MAGNET_URL` env |
| 3 | **GitHub liboqs release** | build_liboqs.sh → external | HTTPS | SHA-256 verified via release tag | `LIBOQS_VERSION` env |
| 4 | **npm registry** | `npm install` → external | HTTPS | Lockfile (`package-lock.json`) pins transitive deps | `package.json` |
| 5 | **crates.io** | `cargo build` → external | HTTPS | `serde_json = "=1.0.150"` exact pin; no other internet crates | `Cargo.toml` |
| 6 | **Vite dev server** | Browser → localhost:3000 | HTTP | Dev only; prod serves from static build | — |

## 2. Local Touchpoints (server → subsystem)

| # | Touchpoint | Origin → Target | Protocol | Security |
|---|------------|-----------------|----------|----------|
| 7 | **Express HTTP server** | Localhost → port 3001 | HTTP | CORS allowlist (`localhost:5173`, `localhost:4173`); rate limit 100/min/IP; body size 4KB limit |
| 8 | **Crypto subprocess (stdin)** | Express → `kylos-crypto-server` | JSON-RL (newline-delimited JSON) | 256-entry pending cap, 30s timeout, max 5 auto-restarts, `getCryptoResult()` error guard |
| 9 | **Crypto subprocess (stdout)** | `kylos-crypto-server` → Express | JSON-RL | Parsed line-by-line via `readline`; malformed lines silently dropped |
| 10 | **liboqs FFI** | `kylos-crypto-server` → `liboqs.so` | C ABI (raw FFI) | Three-family defense (MQ+Lattice+Hash); serde_json::json! prevents injection; 2MB/128KB size limits at Rust level |
| 11 | **Test vectors (filesystem)** | `test_vectors.rs` → Rust test harness | File read | Throwaway CI keys; documented as non-production |

## 3. Local Touchpoints (frontend → server)

| # | Touchpoint | Origin → Target | Protocol | Security |
|---|------------|-----------------|----------|----------|
| 12 | `/api/health` GET | React → Express | HTTP (via Vite proxy) | No auth; returns static status |
| 13 | `/api/rtsw/latest` GET | React → Express | HTTP | Passes through validated NOAA data |
| 14 | `/api/pgate/engage` POST | React → Express | HTTP JSON | Mode enum validation; `validateNumber()` finite check |
| 15 | `/api/veracity/calculate` POST | React → Express | HTTP JSON | `validateNumber()` finite check on both fields |
| 16 | `/api/quorum/calculate` POST | React → Express | HTTP JSON | `validateNumber()` finite check; `activeNodes >= 1` |
| 17 | `/api/atrophy/calculate` POST | React → Express | HTTP JSON | `validateNumber()` finite check on both fields |
| 18 | `/api/kernel/version` GET | React → Express | HTTP | Static version response |
| 19 | `/api/crypto/status` GET | React → Express → subprocess | HTTP → JSON-RL | Cached 30s in `CryptoStatusPanel`; `getCryptoResult()` error guard |
| 20 | `/api/crypto/keypair` POST | React → Express → subprocess | HTTP → JSON-RL | 4KB body limit at Express; 128KB key limit at Rust; `getCryptoResult()` guard |
| 21 | `/api/crypto/sign` POST | React → Express → subprocess | HTTP → JSON-RL | Same body/key/sig limits; `message`+`secret_key` required |
| 22 | `/api/crypto/verify` POST | React → Express → subprocess | HTTP → JSON-RL | Same; `message`+`signature`+`public_key` required |

## 4. Frontend Data Flow Touchpoints

| # | Touchpoint | Location | Security |
|---|------------|----------|----------|
| 23 | **Redux cryptoSlice** | `cryptoSlice.ts` | Runtime type validation via `validateCryptoStatus()` before dispatch |
| 24 | **apiService.ts response validation** | All `post<T>()` / `get<T>()` calls | Per-response validator functions reject malformed server data |
| 25 | **zkProof.ts keypair cache** | `keypairCache[algorithm]` | In-memory only; cleared by `clearCache()`; algorithms ≤ 8 entries |
| 26 | **CryptoStatusPanel render** | Reads from Redux store | Pure display; no revalidation needed |
| 27 | **Vite proxy** | `vite.config.ts` → `/api` → `localhost:3001` | Dev only; prod build serves static files directly |
| 28 | **PGateButton proof generation** | `handleEngage()` → `generateProof()` → `verifyProof()` | Error caught by try/catch + console.error |

## 5. Build/Deploy Touchpoints

| # | Touchpoint | File | Security |
|---|------------|------|----------|
| 29 | **build.sh** | `~/cup/kylos-qpadl/build.sh` | No hardcoded paths; uses `LIBOQS_INSTALL_DIR` env |
| 30 | **build_liboqs.sh** | `~/cup/kylos-qpadl/build_liboqs.sh` | Downloads from GitHub; `LIBOQS_VERSION` env (default 0.13.0) |
| 31 | **Cross.toml** | `~/cup/kylos-qpadl/Cross.toml` | `LIBOQS_VERSION` env var for cross-compile |
| 32 | **ci.yml** | `.github/workflows/ci.yml` | Same env var pattern for CI |
| 33 | **cross_compile.sh** | `scripts/cross_compile.sh` | Same env var pattern |
| 34 | **Cargo.toml** | `~/cup/kylos-qpadl/Cargo.toml` | `serde_json` pinned `=1.0.150`; `rust-version = "1.85"`; `edition = "2024"` |

## 6. Eliminated Attack Surfaces

| Surface | How Eliminated |
|---------|---------------|
| Hardcoded WSL paths | `CRYPTO_SERVER_BIN`/`CRYPTO_SERVER_ARGS` env vars with JSON.parse array |
| Hardcoded cargo registry path | `build_liboqs.sh` downloads from GitHub via `LIBOQS_VERSION` |
| JSON injection in crypto server | `serde_json::json!` macro replaces string concat |
| Unbounded allocations (crypto) | `MAX_BODY_BYTES=2MB`, `MAX_KEY_BYTES=128KB`, `MAX_SIG_BYTES=128KB` in Rust |
| Unbounded pending requests | `CRYPTO_PENDING_MAX=256` Map cap |
| Rate-limit Map memory leak | `setInterval` every 5min evicts stale entries |
| Infinite crypto restart loop | `CRYPTO_MAX_RESTARTS=5` cap |
| Crypto response `result.result` access without null check | `getCryptoResult()` helper throws on missing/error |
| `readCryptoBody` write-after-destroy race | `req.destroyed` guard before response write |
| Floating-point drift in crypto | Integer-only arithmetic (MAYO UOV, ML-DSA, SPHINCS+) |
| Unvalidated NOAA response | `validateNOAAResponse()` schema check + `getSafe()` per field |
| Hardcoded NOAA URLs | `NOAA_PLASMA_URL` / `NOAA_MAGNET_URL` env vars |
| Build artifacts committed | `build2.sh`, `build3.sh`, CSVs removed; `.gitignore` covers `.o`/`.a`/`.so`/`.env` |

## 7. Remaining Acceptable Risk

- **No HTTPS**: localhost-only dev server
- **No authentication**: all endpoints unauthenticated (localhost-only in dev)
- **Falcon-512 floating-point FFT**: documented in threat model as temp patch pending NIST On-Ramp
- **NOAA SWPC dependency**: external API; degraded experience on fetch failure
- **npm remote fetch at install time**: implicit trust in registry + lockfile pinning
- **crates.io at build time**: single exact-pinned dependency
