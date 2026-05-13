import React, { Suspense, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ConnectedParticles } from './ConnectedParticles';
import { Float, PerspectiveCamera, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

const MouseLight = () => {
  const lightRef = useRef<THREE.PointLight>(null);
  const { mouse, viewport } = useThree();

  useFrame(() => {
    if (!lightRef.current) return;
    const x = (mouse.x * viewport.width) / 2;
    const y = (mouse.y * viewport.height) / 2;
    lightRef.current.position.set(x, y, 2);
  });

  return <pointLight ref={lightRef} intensity={2.5} color="#E5BC53" distance={15} />;
};

const LuxuryGlassSphere = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { mouse } = useThree();

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    
    // Smoothly follow mouse with delay
    const targetX = mouse.x * 2;
    const targetY = mouse.y * 2;
    
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetX, 0.02);
    meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.02);
    
    // Discrete floating
    meshRef.current.position.y += Math.sin(time) * 0.1;
    meshRef.current.rotation.x = time * 0.2;
    meshRef.current.rotation.y = time * 0.3;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -2]}>
      <sphereGeometry args={[1.5, 64, 64]} />
      <MeshDistortMaterial
        color="#E5BC53"
        speed={1}
        distort={0.2}
        radius={1}
        transparent
        opacity={0.08}
        metalness={0.9}
        roughness={0.1}
      />
    </mesh>
  );
};

const LightRays = () => {
  const count = 12;
  const rays = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      rotation: [0, 0, (i / count) * Math.PI * 2],
      scale: [0.05, 10, 0.05],
      delay: Math.random() * 5
    }));
  }, []);

  return (
    <group position={[0, 0, -5]}>
      {rays.map((ray, i) => (
        <Float key={i} speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
          <mesh rotation={ray.rotation as any} scale={ray.scale as any}>
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshBasicMaterial color="#E5BC53" transparent opacity={0.02} blending={THREE.AdditiveBlending} />
          </mesh>
        </Float>
      ))}
    </group>
  );
};

export const InteractiveLuxuryBackground: React.FC = () => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-black via-primary-black to-[#001a1a] opacity-95" />
      
      <Canvas
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
        dpr={isMobile ? 1 : 1.5}
        style={{ background: 'transparent' }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={60} />
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <MouseLight />
          <pointLight position={[-10, 10, 5]} intensity={1} color="#003030" />
          
          <ConnectedParticles 
            count={prefersReducedMotion ? 20 : (isMobile ? 30 : 80)} 
            color="#E5BC53"
            maxDistance={isMobile ? 3 : 2.5}
          />

          {!prefersReducedMotion && <LuxuryGlassSphere />}
          {!isMobile && <LightRays />}

          {/* Decorative Torus */}
          <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh position={[5, 3, -5]} rotation={[0.5, 0.5, 0.5]}>
              <torusGeometry args={[2, 0.005, 16, 100]} />
              <meshBasicMaterial color="#E5BC53" transparent opacity={0.1} />
            </mesh>
          </Float>
        </Suspense>
      </Canvas>
      
      <div className="absolute inset-0 bg-gradient-to-t from-primary-black via-transparent to-primary-black/30 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)] pointer-events-none" />
    </div>
  );
};


