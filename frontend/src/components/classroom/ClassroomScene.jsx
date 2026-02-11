import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera,
  Environment,
  Float,
  Text,
  Html
} from '@react-three/drei';
import * as THREE from 'three';

// Floor component with grid pattern
const Floor = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial 
        color="#0f172a"
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
};

// Grid helper for futuristic look
const GridFloor = () => {
  return (
    <gridHelper 
      args={[50, 50, '#1e3a5f', '#0f2847']} 
      position={[0, 0.01, 0]}
    />
  );
};

// Smartboard component
const Smartboard = ({ content, isActive }) => {
  return (
    <group position={[0, 3, -8]}>
      {/* Board frame */}
      <mesh>
        <boxGeometry args={[12, 6, 0.2]} />
        <meshStandardMaterial 
          color="#0f172a"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Screen */}
      <mesh position={[0, 0, 0.11]}>
        <planeGeometry args={[11.5, 5.5]} />
        <meshStandardMaterial 
          color={isActive ? "#1e3a5f" : "#0a1628"}
          emissive={isActive ? "#0ea5e9" : "#000000"}
          emissiveIntensity={isActive ? 0.1 : 0}
        />
      </mesh>

      {/* Glowing border */}
      <lineSegments position={[0, 0, 0.12]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(11.6, 5.6)]} />
        <lineBasicMaterial color={isActive ? "#0ea5e9" : "#334155"} />
      </lineSegments>

      {/* Content text */}
      {isActive && (
        <Text
          position={[0, 0, 0.15]}
          fontSize={0.5}
          color="#0ea5e9"
          anchorX="center"
          anchorY="middle"
        >
          Presentation Active
        </Text>
      )}

      {!isActive && (
        <Text
          position={[0, 0, 0.15]}
          fontSize={0.3}
          color="#64748b"
          anchorX="center"
          anchorY="middle"
        >
          ORBITAL CLASSROOM
        </Text>
      )}
    </group>
  );
};

// Avatar component for participants
const Avatar = ({ participant, position, isCurrentUser }) => {
  const color = participant.role === 'teacher' ? '#0ea5e9' : '#d946ef';
  const glowColor = participant.role === 'teacher' ? '#0ea5e9' : '#d946ef';
  
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
      <group position={position}>
        {/* Body */}
        <mesh position={[0, 0.8, 0]} castShadow>
          <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
          <meshStandardMaterial 
            color={color}
            metalness={0.6}
            roughness={0.3}
            emissive={glowColor}
            emissiveIntensity={isCurrentUser ? 0.3 : 0.1}
          />
        </mesh>

        {/* Head */}
        <mesh position={[0, 1.6, 0]} castShadow>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial 
            color={color}
            metalness={0.6}
            roughness={0.3}
            emissive={glowColor}
            emissiveIntensity={isCurrentUser ? 0.3 : 0.1}
          />
        </mesh>

        {/* Hand raised indicator */}
        {participant.is_hand_raised && (
          <mesh position={[0.5, 2.2, 0]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial 
              color="#eab308"
              emissive="#eab308"
              emissiveIntensity={0.5}
            />
          </mesh>
        )}

        {/* Muted indicator */}
        {participant.is_muted && (
          <mesh position={[-0.4, 1.6, 0.3]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshStandardMaterial 
              color="#ef4444"
              emissive="#ef4444"
              emissiveIntensity={0.5}
            />
          </mesh>
        )}

        {/* Name label */}
        <Html
          position={[0, 2.3, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div className={`
            px-2 py-1 rounded-md text-xs whitespace-nowrap
            ${participant.role === 'teacher' 
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50' 
              : 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/50'}
          `}>
            {participant.name}
            {participant.role === 'teacher' && ' (Teacher)'}
            {isCurrentUser && ' (You)'}
          </div>
        </Html>
      </group>
    </Float>
  );
};

// Ambient particles for atmosphere
const Particles = () => {
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 50; i++) {
      temp.push({
        position: [
          (Math.random() - 0.5) * 40,
          Math.random() * 10 + 1,
          (Math.random() - 0.5) * 40
        ],
        scale: Math.random() * 0.05 + 0.02
      });
    }
    return temp;
  }, []);

  return (
    <group>
      {particles.map((particle, i) => (
        <mesh key={i} position={particle.position}>
          <sphereGeometry args={[particle.scale, 8, 8]} />
          <meshBasicMaterial color="#0ea5e9" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
};

// Main classroom scene
const ClassroomScene = ({ participants = [], smartboardContent, currentUserId }) => {
  // Calculate avatar positions in a semicircle
  const getAvatarPosition = (index, total) => {
    const radius = 6;
    const angleSpread = Math.PI * 0.8; // 144 degrees spread
    const startAngle = Math.PI * 0.1; // Start offset
    
    if (total === 1) {
      return [0, 0, 4];
    }
    
    const angle = startAngle + (index / (total - 1)) * angleSpread;
    const x = Math.cos(angle) * radius - radius / 2;
    const z = Math.sin(angle) * radius;
    
    return [x, 0, z];
  };

  return (
    <Canvas shadows dpr={[1, 2]} style={{ background: '#020617' }}>
      <PerspectiveCamera makeDefault position={[0, 5, 12]} fov={50} />
      
      <OrbitControls 
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={8}
        maxDistance={20}
        target={[0, 2, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#0ea5e9" castShadow />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#d946ef" />
      <spotLight
        position={[0, 10, 0]}
        angle={0.3}
        penumbra={1}
        intensity={0.5}
        castShadow
      />

      {/* Fog for depth */}
      <fog attach="fog" args={['#020617', 15, 40]} />

      <Suspense fallback={null}>
        {/* Environment */}
        <Floor />
        <GridFloor />
        <Particles />

        {/* Smartboard */}
        <Smartboard content={smartboardContent} isActive={!!smartboardContent} />

        {/* Participants */}
        {participants.map((participant, index) => (
          <Avatar
            key={participant.user_id}
            participant={participant}
            position={getAvatarPosition(index, participants.length)}
            isCurrentUser={participant.user_id === currentUserId}
          />
        ))}
      </Suspense>
    </Canvas>
  );
};

export default ClassroomScene;
