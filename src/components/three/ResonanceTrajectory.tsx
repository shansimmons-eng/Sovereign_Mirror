import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

const INSTANCE_COUNT = 4000;
const PLASMA_URL = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json';
const MAGNET_URL = 'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json';

const getSafe = (val: number, fallback: number): number => {
  const v = Number(val);
  return (v !== null && v !== undefined && isFinite(v) && v > -900) ? v : fallback;
};

const DEFAULT_RTSW = { speed: 450, density: 15, temperature: 100000, bx: 0, by: 0, bz: -5, bt: 5 };

const vertexShader = `
  attribute vec3 instanceVelocity;
  varying vec3 vColor;
  varying float vIntensity;
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    
    vColor = instanceColor;
    vIntensity = 0.5 + length(instanceVelocity) * 0.3;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vIntensity;
  varying vec2 vUv;
  
  void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center);
    
    if (dist > 0.5) discard;
    
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    
    vec3 amberGlow = vColor * glow * vIntensity;
    vec3 whiteCore = vec3(1.0) * core * 0.8;
    
    gl_FragColor = vec4(amberGlow + whiteCore, glow);
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
        color="#2a2a3a"
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  );
}

function IgnitionCore() {
  const coreRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  useFrame((state) => {
    timeRef.current += state.clock.getDelta();
    if (coreRef.current) {
      const pulse = Math.sin(timeRef.current * 3) * 0.1 + 0.9;
      coreRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <mesh ref={coreRef}>
      <sphereGeometry args={[0.15, 32, 32]} />
      <meshBasicMaterial
        color="#FFFFFF"
        transparent
        opacity={1}
      />
    </mesh>
  );
}

function KineticQuads() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  const instanceVelocities = useMemo(() => new Float32Array(INSTANCE_COUNT * 3), []);

  const rtswRef = useRef(DEFAULT_RTSW);
  const smoothedSpeedRef = useRef(400);
  const smoothedDensityRef = useRef(10);
  const bzDeltaRef = useRef(0);
  const lastFetchRef = useRef(0);

  const particleSeeds = useMemo(() => {
    const seeds = new Float32Array(INSTANCE_COUNT * 5);
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      seeds[i * 5 + 0] = Math.random() * Math.PI * 2;
      seeds[i * 5 + 1] = Math.random() * Math.PI * 2;
      seeds[i * 5 + 2] = 0.3 + Math.random() * 3.5;
      seeds[i * 5 + 3] = Math.random() * 0.1 + 0.01;
      seeds[i * 5 + 4] = Math.random() * 0.8 + 0.2;
    }
    return seeds;
  }, []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(INSTANCE_COUNT * 3), 3);

    const colorMorningGold = new THREE.Color('#FFD54F');
    const colorVibrantAmber = new THREE.Color('#FF8F00');
    const colorBurntOrange = new THREE.Color('#E65100');

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const mixFactor = Math.random();
      const color = tempColor.clone().lerpColors(colorMorningGold, colorVibrantAmber, mixFactor);
      if (Math.random() > 0.5) {
        color.lerp(colorBurntOrange, 0.3);
      }
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

    smoothedSpeedRef.current = THREE.MathUtils.lerp(smoothedSpeedRef.current, safeSpeed, 0.02);
    smoothedDensityRef.current = THREE.MathUtils.lerp(smoothedDensityRef.current, safeDensity, 0.02);

    const speedNorm = Math.min(smoothedSpeedRef.current / 700, 1);
    const densityNorm = Math.min(safeDensity / 20, 1);
    const gustStrength = Math.min(bzDeltaRef.current / 10, 1);
    bzDeltaRef.current *= 0.92;

    const breathFreq = 0.25 + densityNorm * 0.35;
    const breathPhase = Math.sin(time * Math.PI * 2 * breathFreq);
    const breathLerp = (breathPhase + 1) * 0.5;

    const baseOrbit = 0.15 + speedNorm * 0.15;
    const timeStep = (smoothedSpeedRef.current / 400) * 0.012;

    if (!mesh.instanceMatrix) return;

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const seed0 = particleSeeds[i * 5 + 0];
      const seed1 = particleSeeds[i * 5 + 1];
      const radius = particleSeeds[i * 5 + 2];
      const phaseOffset = particleSeeds[i * 5 + 3];
      const lengthFactor = particleSeeds[i * 5 + 4];

      const t = time * timeStep + phaseOffset;
      const orbitRadius = baseOrbit + radius * breathLerp * 0.8;

      const x = Math.sin(seed0 + t * 3.7) * orbitRadius * (1.1 + Math.sin(seed1 + t * 2.3) * 0.4);
      const y = Math.cos(seed1 + t * 2.9) * orbitRadius * (0.9 + Math.cos(seed0 + t * 3.1) * 0.35);
      const z = Math.sin(seed0 + seed1 + t * 4.1) * orbitRadius * 0.6;

      const gustX = Math.sin(time * 12.3 + seed0 * 7.7) * gustStrength * 0.4;
      const gustY = Math.cos(time * 15.1 + seed1 * 9.3) * gustStrength * 0.4;
      const gustZ = Math.sin(time * 11.7 + seed0 * seed1 * 6.1) * gustStrength * 0.4;

      const px = x + gustX;
      const py = y + gustY;
      const pz = z + gustZ;

      dummy.position.set(px, py, pz);

      const lookAtTarget = new THREE.Vector3(0, 0, 0);
      const position = dummy.position.clone();
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion();
      const matrix = new THREE.Matrix4();
      matrix.lookAt(position, lookAtTarget, up);
      quaternion.setFromRotationMatrix(matrix);

      const stretchAmount = 0.5 + lengthFactor * 2.0 + speedNorm * 1.5;
      dummy.scale.set(0.08, 0.08 * stretchAmount, 0.08);

      dummy.quaternion.copy(quaternion);
      dummy.updateMatrix();

      if (isFinite(dummy.matrix.elements[0])) {
        mesh.setMatrixAt(i, dummy.matrix);

        instanceVelocities[i * 3] = gustX * 10;
        instanceVelocities[i * 3 + 1] = gustY * 10;
        instanceVelocities[i * 3 + 2] = gustZ * 10;
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
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          instanceVelocity: { value: instanceVelocities }
        }}
      />
    </instancedMesh>
  );
}

function CameraRig() {
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const camera = state.camera;
    camera.position.x = Math.sin(time * 0.08) * 2.5;
    camera.position.y = Math.cos(time * 0.12) * 2;
    camera.position.z = 18 + Math.sin(time * 0.05) * 3;
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
          outputColorSpace: 'srgb',
          alpha: false,
        }}
        camera={{ position: [0, 0, 18], fov: 55, near: 0.1, far: 1000 }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <ambientLight intensity={0.05} />
        <KineticQuads />
        <StarField />
        <IgnitionCore />
        <CameraRig />
        <EffectComposer>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.9}
            luminanceSmoothing={0.4}
            radius={0.4}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}