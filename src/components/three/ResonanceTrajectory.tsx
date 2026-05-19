import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useHUDStore } from '../../state/stores/hudStore';
import { useNodeStore } from '../../state/stores/nodeStore';

const INSTANCE_COUNT = 5000;
const PLASMA_URL = 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json';
const MAGNET_URL = 'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json';

const DECAY_THRESHOLD = 0.22;

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

const particleVertexShader = `
  uniform float u_time;
  uniform float u_inverion_alpha;
  uniform float u_boltzmann_temp;
  uniform float u_boltzmann_noise;

  varying vec2 vUv;
  varying float vIntensity;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    vUv = uv;
    vec3 transformed = position;

    float instanceID = float(gl_InstanceID);
    float phase = hash(vec3(instanceID, instanceID * 1.3, instanceID * 2.7));

    float theta = u_time * (u_boltzmann_temp * 0.1) + (phase * 6.28318);
    float fissionStretch = sin(theta * 2.0) * (u_boltzmann_noise * 0.38);
    float activeRadius = (2.0 * (1.0 - u_inverion_alpha)) + fissionStretch;
    float radius = clamp(activeRadius, 0.1, 2.0);

    vec3 orbitPos = vec3(cos(theta) * radius, sin(theta) * radius, sin(theta * phase) * 0.15);

    float noiseFactor = hash(orbitPos + vec3(u_time * 0.05));
    vec3 dispersalVector = vec3(cos(phase * 6.28), sin(phase * 6.28), phase * 0.1);

    if (u_inverion_alpha < 0.22) {
      float drift = (1.0 - u_inverion_alpha) * (u_boltzmann_noise * 0.5);
      transformed += orbitPos + (dispersalVector * noiseFactor * drift);
      vIntensity = u_inverion_alpha;
    } else {
      transformed += orbitPos + (dispersalVector * noiseFactor * u_boltzmann_noise * 0.2);
      vIntensity = 1.0;
    }

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec2 vUv;
  varying float vIntensity;

  void main() {
    float dist = length(vUv - vec2(0.5));
    if (dist > 0.5) discard;

    float alphaMask = smoothstep(0.5, 0.2, dist);

    vec3 coreWhite = vec3(1.0, 1.0, 1.0);
    vec3 amberGlow = vec3(1.0, 0.7, 0.1);
    vec3 deepCopper = vec3(0.9, 0.3, 0.0);

    vec3 finalColor = mix(deepCopper, amberGlow, vIntensity);
    if (vIntensity > 0.8) {
      finalColor = mix(finalColor, coreWhite, (vIntensity - 0.8) * 5.0);
    }

    gl_FragColor = vec4(finalColor * (vIntensity * 2.5), alphaMask);
  }
`;

class ParticleShaderMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        u_time: { value: 0 },
        u_inverion_alpha: { value: 1.0 },
        u_boltzmann_temp: { value: 0.5 },
        u_boltzmann_noise: { value: 0.1 },
      },
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }
}

extend({ ParticleShaderMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      particleShaderMaterial: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        ref?: React.Ref<ParticleShaderMaterial>;
        attach?: string;
      };
    }
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

function IgnitionCore({ inverionAlpha }: { inverionAlpha: number }) {
  const coreRef = useRef<THREE.Mesh>(null!);
  const haloRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  const isDecayed = inverionAlpha < DECAY_THRESHOLD;
  const safeAlpha = Math.max(0.001, inverionAlpha);
  const coreAttenuation = isDecayed
    ? (safeAlpha / DECAY_THRESHOLD) * (safeAlpha / DECAY_THRESHOLD)
    : 1.0;

  useFrame((state) => {
    timeRef.current += state.clock.getDelta();
    const t = timeRef.current;

    const pulse = isDecayed
      ? 1 + Math.sin(t * 2) * 0.05
      : 1 + Math.sin(t * 4) * 0.15;
    const breathe = 1 + Math.sin(t * 0.5) * 0.05;
    const baseOpacity = isDecayed
      ? 0.3 * coreAttenuation
      : 0.95 * coreAttenuation;

    if (coreRef.current) {
      coreRef.current.scale.setScalar(pulse * breathe);
      const material = coreRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = baseOpacity + Math.sin(t * 3) * 0.05 * coreAttenuation;
      if (isDecayed) {
        material.color.setHex(0xFF6B35);
      } else {
        material.color.setHex(0xFFFFFF);
      }
    }

    if (haloRef.current) {
      const haloPulse = isDecayed
        ? 1.0 + Math.sin(t * 1) * 0.1
        : 1.2 + Math.sin(t * 2.5) * 0.3;
      haloRef.current.scale.setScalar(haloPulse);
      const material = haloRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.15 * coreAttenuation + Math.sin(t * 2) * 0.05 * coreAttenuation;
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
  const bzDeltaRef = useRef(0);
  const lastFetchRef = useRef(0);

  const prevPositionsRef = useRef<Float32Array | null>(null);
  const velocitiesRef = useRef<Float32Array | null>(null);

  const temperature = useHUDStore((s) => s.temperature);
  const noiseFilter = useHUDStore((s) => s.noiseFilter);
  const inverionAlpha = useNodeStore((s) => s.flux);
  const setSyncStatus = useNodeStore((s) => s.setSyncStatus);

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

  const instancePhases = useMemo(() => {
    const phases = new Float32Array(INSTANCE_COUNT);
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      phases[i] = Math.random();
    }
    return phases;
  }, []);

  const instanceVelocities = useMemo(() => {
    const vels = new Float32Array(INSTANCE_COUNT * 3);
    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      vels[i * 3 + 0] = Math.sin(phi) * Math.cos(theta);
      vels[i * 3 + 1] = Math.sin(phi) * Math.sin(theta);
      vels[i * 3 + 2] = Math.cos(phi);
    }
    return vels;
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
    prevPositionsRef.current = new Float32Array(INSTANCE_COUNT * 3);
    velocitiesRef.current = new Float32Array(INSTANCE_COUNT * 3);
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

    const material = mesh.material as THREE.ShaderMaterial;
    if (!material || !material.uniforms) return;

    const delta = state.clock.getDelta();
    if (delta > 0.15 || !isFinite(delta)) return;

    const time = state.clock.getElapsedTime();
    const rtsw = rtswRef.current;

    const safeSpeed = getSafe(rtsw.speed, 400);
    smoothedSpeedRef.current = THREE.MathUtils.lerp(smoothedSpeedRef.current, safeSpeed, 0.015);

    const speedNorm = Math.min(smoothedSpeedRef.current / 700, 1);
    const gustStrength = Math.min(bzDeltaRef.current / 10, 1);
    bzDeltaRef.current *= 0.92;

    material.uniforms.u_time.value = Math.max(0.001, time);
    const defensiveAlpha = Math.max(0.002, inverionAlpha);
    material.uniforms.u_inverion_alpha.value = defensiveAlpha;
    material.uniforms.u_boltzmann_temp.value = Math.max(0.01, 0.3 + temperature * 2.0);
    material.uniforms.u_boltzmann_noise.value = Math.max(0.001, 0.05 + noiseFilter * 0.5);

    const isDecayed = inverionAlpha < DECAY_THRESHOLD;

    if (inverionAlpha === 0) {
      setSyncStatus('STANDBY', 0);
    } else if (inverionAlpha > 0 && inverionAlpha < 0.22) {
      setSyncStatus('SYNCING', 3);
    } else {
      setSyncStatus('ACTIVE', 7);
    }

    const decayFactor = isDecayed ? 1.0 - (inverionAlpha / DECAY_THRESHOLD) : 0;
    const escapeStrength = decayFactor * decayFactor * 1.5;

    const baseTimeStep = (smoothedSpeedRef.current / 400) * 0.01;

    if (!mesh.instanceMatrix) return;

    const prevPositions = prevPositionsRef.current;
    const velocities = velocitiesRef.current;
    const positions = new Float32Array(INSTANCE_COUNT * 3);

    for (let i = 0; i < INSTANCE_COUNT; i++) {
      const seed0 = particleSeeds[i * 6 + 0];
      const seed1 = particleSeeds[i * 6 + 1];
      const radius = particleSeeds[i * 6 + 2];
      const phaseOffset = particleSeeds[i * 6 + 3];
      const lengthFactor = particleSeeds[i * 6 + 4];
      const tiltPhase = particleSeeds[i * 6 + 5];

      const t = time * baseTimeStep + phaseOffset;
      const instancePhase = instancePhases[i];
      const vel = new THREE.Vector3(
        instanceVelocities[i * 3],
        instanceVelocities[i * 3 + 1],
        instanceVelocities[i * 3 + 2]
      );

      let px: number, py: number, pz: number;

      if (isDecayed) {
        const drift = decayFactor * time * (noiseFilter + 0.1);
        const escapeDir = vel.clone().normalize();
        const r = radius * 0.5 + 0.5;
        const angle = t * 0.5 + seed0;
        px = Math.cos(angle) * r + escapeDir.x * drift;
        py = Math.sin(angle) * r + escapeDir.y * drift;
        pz = Math.sin(seed0 + seed1 + t * 0.3) * 0.5 + escapeDir.z * drift;
      } else {
        const R_inner = 0.5 + inverionAlpha * 2.5;
        const theta = time * (0.3 + temperature * 2.0) * (0.5 + instancePhase);
        const r = R_inner + vel.y * 0.3;
        px = Math.cos(theta) * r;
        py = Math.sin(theta) * r;
        pz = Math.sin(seed0 + seed1 + t * 0.5) * 0.4;
      }

      const gustX = Math.sin(time * 10.3 + seed0 * 6.7) * gustStrength * 0.15;
      const gustY = Math.cos(time * 12.1 + seed1 * 8.3) * gustStrength * 0.15;
      const gustZ = Math.sin(time * 9.7 + seed0 * seed1 * 5.1) * gustStrength * 0.15;

      px += gustX;
      py += gustY;
      pz += gustZ;

      if (prevPositions && escapeStrength > 0.01 && isDecayed) {
        const prevX = prevPositions[i * 3];
        const prevY = prevPositions[i * 3 + 1];
        const prevZ = prevPositions[i * 3 + 2];

        if (isFinite(prevX) && isFinite(prevY) && isFinite(prevZ)) {
          let vx = px - prevX;
          let vy = py - prevY;
          let vz = pz - prevZ;

          const vMag = Math.sqrt(vx * vx + vy * vy + vz * vz);
          if (vMag > 0.001) {
            vx /= vMag;
            vy /= vMag;
            vz /= vMag;
          } else {
            vx = vel.x;
            vy = vel.y;
            vz = vel.z;
          }

          const escapeAmount = escapeStrength * (0.5 + Math.random() * 0.5);
          px += vx * escapeAmount;
          py += vy * escapeAmount;
          pz += vz * escapeAmount;
        }
      }

      positions[i * 3] = px;
      positions[i * 3 + 1] = py;
      positions[i * 3 + 2] = pz;

      if (velocities) {
        velocities[i * 3] = px - (prevPositions ? prevPositions[i * 3] : px);
        velocities[i * 3 + 1] = py - (prevPositions ? prevPositions[i * 3 + 1] : py);
        velocities[i * 3 + 2] = pz - (prevPositions ? prevPositions[i * 3 + 2] : pz);
      }

      dummy.position.set(px, py, pz);

      const lookAtTarget = new THREE.Vector3(0, 0, 0);
      const position = dummy.position.clone();
      const up = new THREE.Vector3(0, 1, 0);
      const quaternion = new THREE.Quaternion();
      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.lookAt(position, lookAtTarget, up);
      quaternion.setFromRotationMatrix(rotationMatrix);

      const stretchBase = 0.3 + lengthFactor * 2.5 + speedNorm * 2.0;
      const stretchNoise = (isDecayed ? noiseFilter : 0) * Math.sin(tiltPhase + time * 5) * 0.4;
      const stretchAmount = stretchBase + stretchNoise;
      dummy.scale.set(0.04, 0.04 * stretchAmount, 0.04);

      dummy.quaternion.copy(quaternion);
      dummy.updateMatrix();

      if (isFinite(dummy.matrix.elements[0])) {
        mesh.setMatrixAt(i, dummy.matrix);
      }
    }

    prevPositionsRef.current = positions;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, INSTANCE_COUNT]}
      frustumCulled={false}
    >
      <planeGeometry args={[0.12, 1.6]} />
      <particleShaderMaterial />
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

function DecayBloomEffect({ inverionAlpha }: { inverionAlpha: number }) {
  const isDecayed = inverionAlpha < DECAY_THRESHOLD;

  const intensity = isDecayed
    ? 0.3 + (inverionAlpha / DECAY_THRESHOLD) * 0.5
    : 0.8 + inverionAlpha * 2.2;

  const threshold = isDecayed
    ? 0.6 + (1.0 - inverionAlpha / DECAY_THRESHOLD) * 0.3
    : 0.25 + (1.0 - inverionAlpha) * 0.1;

  return (
    <EffectComposer>
      <Bloom
        intensity={intensity}
        luminanceThreshold={threshold}
        luminanceSmoothing={0.7}
        radius={0.7}
        mipmapBlur
      />
    </EffectComposer>
  );
}

export function ResonanceTrajectory() {
  const inverionAlpha = useNodeStore((s) => s.flux);
  const isDecayed = inverionAlpha < DECAY_THRESHOLD;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const canvas = container.querySelector('canvas');
        if (canvas) {
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
        }
      }
    });
    
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{
        background: '#000000',
        height: '100%',
        minHeight: '250px',
      }}
    >
      <Canvas
        style={{ width: '100%', height: '100%', display: 'block' }}
        gl={{
          toneMapping: THREE.NoToneMapping,
          toneMappingExposure: isDecayed ? 0.8 : 1.5,
          outputColorSpace: 'srgb',
        }}
        camera={{ position: [0, 0, 16], fov: 50, near: 0.1, far: 1000 }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <pointLight
          position={[0, 0, 0]}
          intensity={isDecayed ? 0.2 * (inverionAlpha / DECAY_THRESHOLD) : 0.8}
          color={isDecayed ? '#FF6B35' : '#FFFFFF'}
          distance={isDecayed ? 3 : 6}
        />
        <KineticQuads />
        <StarField />
        <IgnitionCore inverionAlpha={inverionAlpha} />
        <CameraRig />
        <DecayBloomEffect inverionAlpha={inverionAlpha} />
      </Canvas>
    </div>
  );
}