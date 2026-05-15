import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useHUDStore } from '../../state/stores/hudStore';

const INSTANCE_COUNT = 5000;
const PLASMA_URL = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json';
const MAGNET_URL = 'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json';

const getSafe = (val: number, fallback: number): number => {
  const v = Number(val);
  return (v !== null && v !== undefined && isFinite(v) && v > -900) ? v : fallback;
};

const DEFAULT_RTSW = { speed: 450, density: 15, temperature: 100000, bx: 0, by: 0, bz: -5, bt: 5 };

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

function StarField() {
  const points = useMemo(() => {
    const positions = new Float32Array(800 * 3);
    for (let i = 0; i < 800; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 50 + Math.random() * 50;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    return positions;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={800}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        color="#3a3a4a"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

function IgnitionCore() {
  const coreRef = useRef<THREE.Mesh>(null!);
  const haloRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  useFrame((state) => {
    timeRef.current += state.clock.getDelta();
    const t = timeRef.current;

    if (coreRef.current) {
      const pulse = 1 + Math.sin(t * 4) * 0.15;
      const breathe = 1 + Math.sin(t * 0.5) * 0.05;
      coreRef.current.scale.setScalar(pulse * breathe);
      const material = coreRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.9 + Math.sin(t * 3) * 0.1;
    }

    if (haloRef.current) {
      const haloPulse = 1.2 + Math.sin(t * 2.5) * 0.3;
      haloRef.current.scale.setScalar(haloPulse);
      const material = haloRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.25 + Math.sin(t * 2) * 0.1;
    }
  });

  return (
    <group>
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color="#FF8F00" transparent opacity={0.25} />
      </mesh>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

function KineticQuads() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  const rtswRef = useRef(DEFAULT_RTSW);
  const smoothedSpeedRef = useRef(400);
  const smoothedDensityRef = useRef(10);
  const bzDeltaRef = useRef(0);
  const lastFetchRef = useRef(0);

  const temperature = useHUDStore((s) => s.temperature);
  const noiseFilter = useHUDStore((s) => s.noiseFilter);
  const inverionAlpha = useNodeStore((s) => s.flux);

  const particleSeeds = useMemo(() => {
    const seeds = new Float32Array(INSTANCE_COUNT * 6);
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      seeds[i * 6 + 0] = Math.random() * Math.PI * 2;
      seeds[i * 6 + 1] = Math.random() * Math.PI * 2;
      seeds[i * 6 + 2] = 0.2 + Math.random() * 4.5;
      seeds[i * 6 + 3] = Math.random() * 0.08 + 0.005;
      seeds[i * 6 + 4] = Math.random() * 0.5 + 0.5;
      seeds[i * 6 + 5] = Math.random() * Math.PI * 2;
    }
    return seeds;
  }, []);

  const colorPalette = useMemo(() => [
    new THREE.Color('#FFFFFF'),
    new THREE.Color('#FFD54F'),
    new THREE.Color('#FF8F00'),
    new THREE.Color('#FF6F00'),
    new THREE.Color('#FFB300'),
    new THREE.Color('#E65100'),
    new THREE.Color('#FFA726'),
    new THREE.Color('#FF9100'),
  ], []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(INSTANCE_COUNT * 3), 3);

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const c1 = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      const c2 = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      const mixFactor = Math.random();
      const color = tempColor.clone().lerpColors(c1, c2, mixFactor);

      const dist = particleSeeds[i * 6 + 2];
      const distFactor = Math.max(0, 1 - dist / 5);
      color.lerp(new THREE.Color('#FFFFFF'), distFactor * 0.7);

      mesh.setColorAt(i, color);
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const now = Date.now();
      if (now - lastFetchRef.current < 10000) return;
      lastFetchRef.current = now;
      const data = await fetchNOAAData();
      if (data) {
        bzDeltaRef.current = Math.abs(data.bz - rtswRef.current.bz);
        rtswRef.current = data;
      }
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const delta = state.clock.getDelta();
    if (delta > 0.15 || !isFinite(delta)) return;

    const time = state.clock.getElapsedTime();
    const rtsw = rtswRef.current;

    const safeSpeed = getSafe(rtsw.speed, 400);
    const safeDensity = getSafe(rtsw.density, 10);

    smoothedSpeedRef.current = THREE.MathUtils.lerp(smoothedSpeedRef.current, safeSpeed, 0.015);
    smoothedDensityRef.current = THREE.MathUtils.lerp(smoothedDensityRef.current, safeDensity, 0.015);

    const speedNorm = Math.min(smoothedSpeedRef.current / 700, 1);
    const densityNorm = Math.min(safeDensity / 20, 1);
    const gustStrength = Math.min(bzDeltaRef.current / 10, 1);
    bzDeltaRef.current *= 0.92;

    const tempJitter = temperature * 0.8;
    const noiseJitter = noiseFilter * 0.6;
    const coherenceFactor = inverionAlpha;

    const breathFreq = 0.2 + densityNorm * 0.3;
    const breathPhase = Math.sin(time * Math.PI * 2 * breathFreq);
    const breathLerp = (breathPhase + 1) * 0.5;

    const baseOrbit = 0.1 + speedNorm * 0.2;
    const timeStep = (smoothedSpeedRef.current / 400) * 0.01;

    if (!mesh.instanceMatrix) return;

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const seed0 = particleSeeds[i * 6 + 0];
      const seed1 = particleSeeds[i * 6 + 1];
      const radius = particleSeeds[i * 6 + 2];
      const phaseOffset = particleSeeds[i * 6 + 3];
      const lengthFactor = particleSeeds[i * 6 + 4];
      const tiltPhase = particleSeeds[i * 6 + 5];

      const t = time * timeStep + phaseOffset;

      const turbulenceX = (Math.sin(time * 8 + seed0 * 5) + Math.sin(time * 13 + seed1 * 7) * 0.5) * tempJitter;
      const turbulenceY = (Math.cos(time * 9 + seed1 * 6) + Math.cos(time * 11 + seed0 * 9) * 0.5) * tempJitter;
      const turbulenceZ = (Math.sin(time * 7 + seed0 * seed1 * 4) + Math.sin(time * 17 + seed1 * seed0 * 3) * 0.5) * tempJitter;

      const orbitRadius = (baseOrbit + radius * breathLerp * 0.6) * (0.4 + coherenceFactor * 0.6);

      const baseX = Math.sin(seed0 + t * 3.5) * orbitRadius * (1.1 + Math.sin(seed1 + t * 2.1) * 0.35);
      const baseY = Math.cos(seed1 + t * 2.7) * orbitRadius * (0.9 + Math.cos(seed0 + t * 2.9) * 0.3);
      const baseZ = Math.sin(seed0 + seed1 + t * 3.8) * orbitRadius * 0.5;

      const gustX = Math.sin(time * 10.3 + seed0 * 6.7) * gustStrength * 0.35;
      const gustY = Math.cos(time * 12.1 + seed1 * 8.3) * gustStrength * 0.35;
      const gustZ = Math.sin(time * 9.7 + seed0 * seed1 * 5.1) * gustStrength * 0.35;

      const px = baseX + gustX + turbulenceX;
      const py = baseY + gustY + turbulenceY;
      const pz = baseZ + gustZ + turbulenceZ;

      dummy.position.set(px, py, pz);

      const lookAtTarget = new THREE.Vector3(0, 0, 0);
      const position = dummy.position.clone();
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion();
      const matrix = new THREE.Matrix4();
      matrix.lookAt(position, lookAtTarget, up);
      quaternion.setFromRotationMatrix(matrix);

      const stretchBase = 0.4 + lengthFactor * 3.0 + speedNorm * 2.5;
      const stretchNoise = noiseJitter * Math.sin(tiltPhase + time * 5) * 0.3;
      const stretchAmount = stretchBase + stretchNoise;
      dummy.scale.set(0.05, 0.05 * stretchAmount, 0.05);

      dummy.quaternion.copy(quaternion);
      dummy.updateMatrix();

      if (isFinite(dummy.matrix.elements[0])) {
        mesh.setMatrixAt(i, dummy.matrix);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, INSTANCE_COUNT]}
      frustumCulled={false}
    >
      <planeGeometry args={[0.15, 1.8]} />
      <meshBasicMaterial
        color="#FFFFFF"
        transparent
        opacity={0.85}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
}

function CameraRig() {
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const camera = state.camera;
    camera.position.x = Math.sin(time * 0.06) * 3;
    camera.position.y = Math.cos(time * 0.08) * 2.5;
    camera.position.z = 16 + Math.sin(time * 0.04) * 2;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function ResonanceTrajectory() {
  return (
    <div
      className="relative w-full h-full"
      style={{
        background: '#000000',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{
          toneMapping: THREE.NoToneMapping,
          toneMappingExposure: 1.5,
          outputColorSpace: 'srgb',
          alpha: false,
        }}
        camera={{ position: [0, 0, 16], fov: 50, near: 0.1, far: 1000 }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <pointLight position={[0, 0, 0]} intensity={0.8} color="#FFFFFF" distance={6} />
        <KineticQuads />
        <StarField />
        <IgnitionCore />
        <CameraRig />
        <EffectComposer>
          <Bloom
            intensity={2.5}
            luminanceThreshold={0.82}
            luminanceSmoothing={0.65}
            radius={0.65}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}