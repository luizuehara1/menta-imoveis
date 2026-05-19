import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Float, Sphere } from '@react-three/drei';

interface ConnectedParticlesProps {
  count?: number;
  color?: string;
  maxDistance?: number;
}

export const ConnectedParticles: React.FC<ConnectedParticlesProps> = ({ 
  count = 100, 
  color = "#E5BC53",
  maxDistance = 2.5
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const { mouse } = useThree();

  const [particles, connections] = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3 + 0] = (Math.random() - 0.5) * 12;
      p[i * 3 + 1] = (Math.random() - 0.5) * 12;
      p[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }

    // Pre-calculate some connections (limited for performance)
    const lineCoords = [];
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = p[i * 3] - p[j * 3];
        const dy = p[i * 3 + 1] - p[j * 3 + 1];
        const dz = p[i * 3 + 2] - p[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (dist < maxDistance && lineCoords.length < 1000) {
          lineCoords.push(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
          lineCoords.push(p[j * 3], p[j * 3 + 1], p[j * 3 + 2]);
        }
      }
    }
    
    return [p, new Float32Array(lineCoords)];
  }, [count, maxDistance]);

  useFrame((state) => {
    if (!pointsRef.current || !linesRef.current) return;
    
    const time = state.clock?.getElapsedTime() || (performance.now() / 1000);
    
    // Smooth movement based on mouse
    const targetX = (mouse?.x || 0) * 0.4;
    const targetY = (mouse?.y || 0) * 0.4;
    
    pointsRef.current.rotation.x = THREE.MathUtils.lerp(pointsRef.current.rotation.x, targetY * 0.15, 0.05);
    pointsRef.current.rotation.y = THREE.MathUtils.lerp(pointsRef.current.rotation.y, targetX * 0.15, 0.05);
    
    linesRef.current.rotation.x = pointsRef.current.rotation.x;
    linesRef.current.rotation.y = pointsRef.current.rotation.y;

    // Movement
    pointsRef.current.position.y = Math.sin(time * 0.1) * 0.1;
    linesRef.current.position.y = pointsRef.current.position.y;
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particles.length / 3}
            array={particles}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color={color}
          transparent
          opacity={0.5}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={connections.length / 3}
            array={connections}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={color}
          transparent
          opacity={0.1}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      
      {/* Glow balls */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <group position={[4, 2, -3]}>
          <Sphere args={[0.6, 16, 16]}>
            <meshBasicMaterial color="#E5BC53" transparent opacity={0.03} />
          </Sphere>
        </group>
        <group position={[-5, -2, -4]}>
          <Sphere args={[1.2, 16, 16]}>
            <meshBasicMaterial color="#003030" transparent opacity={0.1} />
          </Sphere>
        </group>
      </Float>
    </group>
  );
};

