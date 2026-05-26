import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ConcentricRingProps {
  inverionAlpha: number;
  temperature: number;
}

export function ConcentricRings({ inverionAlpha, temperature }: ConcentricRingProps) {
  const outerRingRef = useRef<THREE.Group>(null!);
  const middleRingRef = useRef<THREE.Group>(null!);
  const innerRingRef = useRef<THREE.Group>(null!);
  const barbellRef = useRef<THREE.Group>(null!);
  const coreRef = useRef<THREE.Group>(null!);

  const timeRef = useRef(0);

  useFrame((state) => {
    timeRef.current += state.clock.getDelta();

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = timeRef.current * 0.05;
    }
    if (middleRingRef.current) {
      middleRingRef.current.rotation.z = -timeRef.current * 0.08;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = timeRef.current * 0.12;
    }
    if (coreRef.current) {
      const breathe = 1 + Math.sin(timeRef.current * 2) * 0.1;
      coreRef.current.scale.setScalar(breathe);
    }
    if (barbellRef.current) {
      barbellRef.current.rotation.z = timeRef.current * 0.03;
    }
  });

  const isDecayed = inverionAlpha < 0.22;
  const baseOpacity = 0.4 + temperature * 0.3;
  const coreBrightness = isDecayed ? 0.2 + (inverionAlpha / 0.22) * 0.4 : 0.6 + inverionAlpha * 0.4;
  
  // Barbell deformation - strands appear when alpha is very low
  const strandIntensity = isDecayed ? (1 - inverionAlpha / 0.22) : 0;

  return (
    <group position={[0, 0, 0]}>
      {/* Outer ring group - shrinks when decayed */}
      <group ref={outerRingRef} scale={[1 - strandIntensity * 0.3, 1 - strandIntensity * 0.3, 1]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.0, 3.1, 128]} />
          <meshBasicMaterial color="#FFB300" transparent opacity={baseOpacity * 0.4 * (1 - strandIntensity * 0.5)} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Middle ring group */}
      <group ref={middleRingRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.0, 2.08, 128]} />
          <meshBasicMaterial color="#FF8F00" transparent opacity={baseOpacity * 0.6 * (1 - strandIntensity * 0.5)} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Inner ring group */}
      <group ref={innerRingRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.0, 1.05, 128]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={baseOpacity * 0.8 * (1 - strandIntensity * 0.7)} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Barbell lobes - visible when alpha is very low (strands state) */}
      <group ref={barbellRef} style={{ display: strandIntensity > 0.3 ? 'flex' : 'none' }}>
        {/* Left lobe */}
        <mesh position={[-2.5, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[0.3 + strandIntensity * 0.2, 32, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={strandIntensity * 0.6} />
        </mesh>
        {/* Right lobe */}
        <mesh position={[2.5, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[0.3 + strandIntensity * 0.2, 32, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={strandIntensity * 0.6} />
        </mesh>
        {/* Connecting strands */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02 + strandIntensity * 0.03, 0.02 + strandIntensity * 0.03, 4.5, 16]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={strandIntensity * 0.3} />
        </mesh>
      </group>

      {/* Central core - golden when decayed, white when active */}
      <group ref={coreRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.15, 32]} />
          <meshBasicMaterial 
            color={isDecayed ? '#FFD700' : '#FFFFFF'} 
            transparent 
            opacity={coreBrightness} 
          />
        </mesh>
        {/* Outer core glow */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.35, 32]} />
          <meshBasicMaterial 
            color={isDecayed ? '#FFD700' : '#FFFFFF'} 
            transparent 
            opacity={coreBrightness * 0.35} 
          />
        </mesh>
      </group>
    </group>
  );
}