import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface OrbitalRingProps {
  radius: number;
  opacity: number;
  color?: string;
  dashed?: boolean;
  dashScale?: number;
  rotationSpeed?: number;
  rotationDirection?: 1 | -1;
}

function OrbitalRing({
  radius,
  opacity,
  color = '#FFB300',
  dashed = false,
  dashScale = 0.03,
  rotationSpeed = 1,
  rotationDirection = 1
}: OrbitalRingProps) {
  const ringRef = useRef<THREE.Mesh>(null!);
  const timeRef = useRef(0);

  useFrame((state) => {
    timeRef.current += state.clock.getDelta();
    if (ringRef.current) {
      ringRef.current.rotation.z = timeRef.current * rotationSpeed * rotationDirection;
    }
  });

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={dashed ? [radius - dashScale, radius + dashScale, 128] : [radius - 0.003, radius + 0.003, 128]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

interface ConcentricRingProps {
  inverionAlpha: number;
  temperature: number;
}

export function ConcentricRings({ inverionAlpha, temperature }: ConcentricRingProps) {
  const outerRingRef = useRef<THREE.Group>(null!);
  const middleRingRef = useRef<THREE.Group>(null!);
  const innerRingRef = useRef<THREE.Group>(null!);
  const crosshairRef = useRef<THREE.Group>(null!);

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
    if (crosshairRef.current) {
      const pulse = 1 + Math.sin(timeRef.current * 2) * 0.05;
      crosshairRef.current.scale.setScalar(pulse);
    }
  });

  const baseOpacity = 0.15 + temperature * 0.2;
  const haloOpacity = 0.08 + inverionAlpha * 0.12;

  return (
    <group>
      <group ref={outerRingRef}>
        <OrbitalRing radius={2.2} opacity={haloOpacity * 0.5} color="#FFD79B" rotationSpeed={0} />
        <OrbitalRing radius={2.0} opacity={baseOpacity * 0.4} dashed dashScale={0.02} rotationSpeed={0} />
      </group>

      <group ref={middleRingRef}>
        <OrbitalRing radius={1.6} opacity={baseOpacity * 0.6} color="#FFB300" rotationSpeed={0} />
        <OrbitalRing radius={1.4} opacity={baseOpacity * 0.3} dashed dashScale={0.015} rotationSpeed={0} />
      </group>

      <group ref={innerRingRef}>
        <OrbitalRing radius={1.0} opacity={baseOpacity * 0.8} color="#FF8F00" rotationSpeed={0} />
        <OrbitalRing radius={0.85} opacity={baseOpacity * 0.4} dashed dashScale={0.01} rotationSpeed={0} />
      </group>

      <group ref={crosshairRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.12 - 0.002, 0.12 + 0.002, 32]} />
          <meshBasicMaterial color="#FFD79B" transparent opacity={0.3 + inverionAlpha * 0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.6, 0.001]} />
          <meshBasicMaterial color="#FFD79B" transparent opacity={0.25} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.001, 0.6]} />
          <meshBasicMaterial color="#FFD79B" transparent opacity={0.25} />
        </mesh>
      </group>
    </group>
  );
}