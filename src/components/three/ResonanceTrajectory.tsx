import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useHUDStore } from '../../state/stores/hudStore';

const PARTICLE_COUNT = 2000;

const PLASMA_URL = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json';
const MAGNET_URL = 'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json';

const getSafe = (val: number, fallback: number): number => {
  const v = Number(val);
  return (v !== null && v !== undefined && isFinite(v) && v > -900) ? v : fallback;
};

const BASE_GEOMETRY = new THREE.PlaneGeometry(1, 1);

const DEFAULT_RTSW = { speed: 400, density: 10, temperature: 100000, bx: 0, by: 0, bz: 0, bt: 5 };

async function fetchNOAAData() {
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
      speed: lp.speed ?? 400,
      density: lp.density ?? 10,
      temperature: lp.temperature ?? 100000,
      bx: lm.bx ?? 0, by: lm.by ?? 0, bz: lm.bz ?? 0, bt: lm.bt ?? 0,
    };
  } catch (e) {
    return null;
  }
}

function SceneContent() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const _origin = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const rtswRef = useRef(DEFAULT_RTSW);
  const smoothedSpeedRef = useRef(400);
  const smoothedDensityRef = useRef(10);
  const bzDeltaRef = useRef(0);
  const lastLogRef = useRef(0);
  const lastFetchRef = useRef(0);

  const particleSeeds = useMemo(() => {
    const seeds = new Float32Array(PARTICLE_COUNT * 4);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      seeds[i * 4 + 0] = Math.random() * Math.PI * 2;
      seeds[i * 4 + 1] = Math.random() * Math.PI * 2;
      seeds[i * 4 + 2] = 0.5 + Math.random() * 2.8;
      seeds[i * 4 + 3] = Math.random() * 0.15 + 0.01;
    }
    return seeds;
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const initColor = new THREE.Color(100, 50, 10);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      mesh.setColorAt(i, initColor);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    console.log('[init] done, instanceColor=' + (mesh.instanceColor ? 'OK' : 'null'));
  }, []);

  useEffect(() => {
    console.log('[fetch] starting interval');
    const interval = setInterval(async () => {
      const now = Date.now();
      if (now - lastFetchRef.current < 10000) return;
      lastFetchRef.current = now;
      const data = await fetchNOAAData();
      if (data) {
        bzDeltaRef.current = Math.abs(data.bz - rtswRef.current.bz);
        rtswRef.current = data;
        console.log('[fetch] NOAA updated: speed=' + data.speed + ' density=' + data.density);
      }
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const delta = state.clock.getDelta();
    if (delta > 0.15 || !isFinite(delta)) return;

    if (!mesh.instanceColor) return;

    const time = state.clock.getElapsedTime();
    const rtsw = rtswRef.current;

    const safeSpeed = getSafe(rtsw.speed, 400);
    const safeDensity = getSafe(rtsw.density, 10);
    const safeBz = getSafe(rtsw.bz, 0);

    smoothedSpeedRef.current = THREE.MathUtils.lerp(smoothedSpeedRef.current, safeSpeed, 0.02);
    smoothedDensityRef.current = THREE.MathUtils.lerp(smoothedDensityRef.current, safeDensity, 0.02);

    const speedNorm = Math.min(smoothedSpeedRef.current / 700, 1);
    const densityNorm = Math.min(safeDensity / 20, 1);
    const bzNorm = Math.min(Math.abs(safeBz) / 15, 1);
    const gustStrength = Math.min(bzDeltaRef.current / 10, 1);
    bzDeltaRef.current *= 0.92;

    const baseBreath = 0.25;
    const breathFreq = baseBreath + densityNorm * 0.35;
    const breathPhase = Math.sin(time * Math.PI * 2 * breathFreq);
    const breathLerp = (breathPhase + 1) * 0.5;

    const collapseForce = densityNorm * (0.3 + breathLerp * 0.7) * 0.8;
    const exhaleForce = (1 - breathLerp) * (0.1 + speedNorm * 0.2);

    const baseOrbit = 0.15 + speedNorm * 0.1;
    const timeStep = (smoothedSpeedRef.current / 400) * 0.015;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const seed0 = particleSeeds[i * 4 + 0];
      const seed1 = particleSeeds[i * 4 + 1];
      const radius = particleSeeds[i * 4 + 2];
      const phaseOffset = particleSeeds[i * 4 + 3];

      const t = time * timeStep + phaseOffset;
      const orbitRadius = baseOrbit + radius * breathLerp * 0.8;

      const x = Math.sin(seed0 + t * 3.7) * orbitRadius * (1.1 + Math.sin(seed1 + t * 2.3) * 0.4);
      const y = Math.cos(seed1 + t * 2.9) * orbitRadius * (0.9 + Math.cos(seed0 + t * 3.1) * 0.35);
      const z = Math.sin(seed0 + seed1 + t * 4.1) * orbitRadius * 0.6;

      const gustX = Math.sin(time * 12.3 + seed0 * 7.7) * gustStrength * 0.4;
      const gustY = Math.cos(time * 15.1 + seed1 * 9.3) * gustStrength * 0.4;
      const gustZ = Math.sin(time * 11.7 + seed0 * seed1 * 6.1) * gustStrength * 0.4;

      dummy.position.set(x + gustX, y + gustY, z + gustZ);

      const distFromCenter = dummy.position.length();
      const pullStrength = distFromCenter < 1.0
        ? 0.15 + breathLerp * 0.10
        : Math.min(collapseForce, 0.3);
      dummy.position.lerp(_origin, pullStrength * 0.05);

      if (exhaleForce > 0.01 && distFromCenter > 0.05) {
        const len = distFromCenter < 0.01 ? 0.01 : distFromCenter;
        dummy.position.addScaledVector(dummy.position, exhaleForce * 0.15 / len);
      }

      if (distFromCenter < 0.01) {
        dummy.position.set(0.01, 0.01, 0.01);
      }

      dummy.scale.setScalar(0.08 + speedNorm * 0.04);
      dummy.quaternion.copy(state.camera.quaternion);
      dummy.updateMatrix();
      if (!isFinite(dummy.matrix.elements[0])) continue;
      mesh.setMatrixAt(i, dummy.matrix);

      const centerDist = dummy.position.length();

      const proximityFactor = Math.max(0, 1.0 - centerDist / 3.0);
      const intensity = 1.0 + proximityFactor * proximityFactor * 999.0;

      const colorT = Math.max(0, Math.min(1, centerDist / 2.5));
      const r = intensity;
      const g = intensity * (1.0 - colorT * 0.5);
      const b = intensity * (1.0 - colorT * 0.85);
      tempColor.setRGB(r, g, b);

      if (i === 0 && time - lastLogRef.current > 1) {
        lastLogRef.current = time;
        console.log('[sanity] pos=(' + dummy.position.x.toFixed(3) + ',' + dummy.position.y.toFixed(3) + ',' + dummy.position.z.toFixed(3) + ') dist=' + centerDist.toFixed(3) + ' intensity=' + intensity.toFixed(1) + ' colorT=' + colorT.toFixed(2));
      }

      if (mesh.setColorAt) mesh.setColorAt(i, tempColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[BASE_GEOMETRY, undefined, PARTICLE_COUNT]} frustumCulled={false}>
      <meshBasicMaterial
        vertexColors
        transparent
        opacity={1.0}
        blending={THREE.AdditiveBlending}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

export function ResonanceTrajectory() {
  const sunriseOpacity = useHUDStore((s) => s.sunriseOpacity);

  return (
    <div className="relative w-full h-full" style={{ background: '#000000' }}>
      <Canvas
        gl={{
          toneMapping: THREE.NoToneMapping,
          outputColorSpace: 'srgb',
          alpha: false,
        }}
        camera={{ position: [0, 0, 10], fov: 60, near: 0.1, far: 100 }}
        dpr={1}
      >
        <SceneContent />
      </Canvas>
    </div>
  );
}