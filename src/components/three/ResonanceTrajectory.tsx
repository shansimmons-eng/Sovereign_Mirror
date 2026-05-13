import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useNodeStore } from '../../state/stores/nodeStore';

const PARTICLE_COUNT = 2000;

const PLASMA_URL = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json';
const MAGNET_URL = 'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json';

const getSafe = (val: number, fallback: number): number => {
  const v = Number(val);
  return (v !== null && v !== undefined && isFinite(v) && v > -900) ? v : fallback;
};

const DEFAULT_RTSW = { speed: 450, density: 15, temperature: 100000, bx: 0, by: 0, bz: -5, bt: 5 };

const vertexShader = `
  attribute vec3 customColor;
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 8.0 * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    vAlpha = 1.0;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    float r = distance(gl_PointCoord, vec2(0.5));
    if (r > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, r);
    float core = 1.0 - smoothstep(0.0, 0.15, r);
    vec3 finalColor = vColor * glow + vec3(1.0) * core * 0.5;
    gl_FragColor = vec4(finalColor, glow * vAlpha);
  }
`;

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
    const positions = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100 - 30;
    }
    return positions;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={500}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.3}
        color="#4a5568"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

function GlowRing() {
  const ringRef = useRef<THREE.Mesh>(null!);
  const flux = useNodeStore((s) => s.flux);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.getElapsedTime() * 0.1;
      const scale = 1 + Math.sin(state.clock.getElapsedTime() * 2) * 0.05 + flux * 0.3;
      ringRef.current.scale.setScalar(scale);
    }
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[2.5, 2.8, 64]} />
      <meshBasicMaterial
        color="#FB923C"
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SceneContent() {
  const meshRef = useRef<THREE.Points>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);

  const rtswRef = useRef(DEFAULT_RTSW);
  const smoothedSpeedRef = useRef(400);
  const smoothedDensityRef = useRef(10);
  const bzDeltaRef = useRef(0);
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

  const positions = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const colors = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const geometry = mesh.geometry;
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.4;
      colors[i * 3 + 2] = 0.1;
    }
    geometry.attributes.customColor.needsUpdate = true;
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

    smoothedSpeedRef.current = THREE.MathUtils.lerp(smoothedSpeedRef.current, safeSpeed, 0.02);
    smoothedDensityRef.current = THREE.MathUtils.lerp(smoothedDensityRef.current, safeDensity, 0.02);

    const speedNorm = Math.min(smoothedSpeedRef.current / 700, 1);
    const densityNorm = Math.min(safeDensity / 20, 1);
    const gustStrength = Math.min(bzDeltaRef.current / 10, 1);
    bzDeltaRef.current *= 0.92;

    const baseBreath = 0.25;
    const breathFreq = baseBreath + densityNorm * 0.35;
    const breathPhase = Math.sin(time * Math.PI * 2 * breathFreq);
    const breathLerp = (breathPhase + 1) * 0.5;

    const baseOrbit = 0.15 + speedNorm * 0.1;
    const timeStep = (smoothedSpeedRef.current / 400) * 0.015;

    const posAttr = mesh.geometry.attributes.position;
    const colorAttr = mesh.geometry.attributes.customColor;

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

      posAttr.setXYZ(i, x + gustX, y + gustY, z + gustZ);

      const distFromCenter = Math.sqrt((x + gustX) ** 2 + (y + gustY) ** 2 + (z + gustZ) ** 2);
      const proximityFactor = Math.max(0, 1.0 - distFromCenter / 3.0);
      const intensity = 0.5 + proximityFactor * 0.4;

      const hue = 0.05 + speedNorm * 0.08 + densityNorm * 0.05;
      const saturation = 0.8 + gustStrength * 0.2;
      const lightness = 0.4 + intensity * 0.3;

      const color = new THREE.Color().setHSL(hue, saturation, lightness);
      colorAttr.setXYZ(i, color.r, color.g, color.b);
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  return (
    <>
      <points ref={meshRef} frustumCulled={false}>
        <bufferGeometry />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <StarField />
      <GlowRing />
    </>
  );
}

function CameraRig() {
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const camera = state.camera;
    camera.position.x = Math.sin(time * 0.1) * 2;
    camera.position.y = Math.cos(time * 0.15) * 1.5;
    camera.position.z = 20 + Math.sin(time * 0.05) * 3;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function ResonanceTrajectory() {
  return (
    <div
      className="relative w-full h-full"
      style={{
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a0f 70%, #050508 100%)',
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
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2,
          outputColorSpace: 'srgb',
          alpha: false,
        }}
        camera={{ position: [0, 0, 20], fov: 60, near: 0.1, far: 1000 }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 10]} intensity={0.5} color="#FB923C" />
        <SceneContent />
        <CameraRig />
      </Canvas>
    </div>
  );
}