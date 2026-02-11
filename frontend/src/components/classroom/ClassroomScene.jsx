import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

// Simple 3D Scene using raw Three.js 
const ClassroomScene = ({ participants = [], smartboardContent, currentUserId }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const avatarMeshes = useRef({});

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.Fog(0x020617, 15, 50);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x0ea5e9, 0.8);
    pointLight1.position.set(10, 10, 10);
    pointLight1.castShadow = true;
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xd946ef, 0.5);
    pointLight2.position.set(-10, 5, -10);
    scene.add(pointLight2);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid
    const gridHelper = new THREE.GridHelper(50, 50, 0x1e3a5f, 0x0f2847);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Smartboard
    const boardGroup = new THREE.Group();
    boardGroup.position.set(0, 3, -8);

    // Board frame
    const frameGeometry = new THREE.BoxGeometry(12, 6, 0.2);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.1,
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    boardGroup.add(frame);

    // Screen
    const screenGeometry = new THREE.PlaneGeometry(11.5, 5.5);
    const screenMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.05,
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 0.11;
    boardGroup.add(screen);

    // Glowing border
    const borderGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(11.6, 5.6));
    const borderMaterial = new THREE.LineBasicMaterial({ color: 0x0ea5e9 });
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    border.position.z = 0.12;
    boardGroup.add(border);

    scene.add(boardGroup);

    // Particles
    const particleCount = 50;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 10 + 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0x0ea5e9,
      size: 0.1,
      transparent: true,
      opacity: 0.3,
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Animation loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      // Rotate particles slowly
      particles.rotation.y += 0.0002;
      
      // Float avatars
      Object.values(avatarMeshes.current).forEach((avatarGroup, i) => {
        if (avatarGroup) {
          avatarGroup.position.y = Math.sin(Date.now() * 0.001 + i) * 0.1;
        }
      });
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update avatars when participants change
  useEffect(() => {
    if (!sceneRef.current) return;

    // Remove old avatars
    Object.keys(avatarMeshes.current).forEach(userId => {
      if (!participants.find(p => p.user_id === userId)) {
        const avatar = avatarMeshes.current[userId];
        if (avatar) {
          sceneRef.current.remove(avatar);
          delete avatarMeshes.current[userId];
        }
      }
    });

    // Add/update avatars
    participants.forEach((participant, index) => {
      const isTeacher = participant.role === 'teacher';
      const isCurrentUser = participant.user_id === currentUserId;
      const color = isTeacher ? 0x0ea5e9 : 0xd946ef;
      
      // Calculate position in semicircle
      const getPosition = (idx, total) => {
        const radius = 6;
        const angleSpread = Math.PI * 0.8;
        const startAngle = Math.PI * 0.1;
        
        if (total === 1) return [0, 0, 4];
        
        const angle = startAngle + (idx / (total - 1)) * angleSpread;
        const x = Math.cos(angle) * radius - radius / 2;
        const z = Math.sin(angle) * radius;
        
        return [x, 0, z];
      };

      const [x, y, z] = getPosition(index, participants.length);

      if (!avatarMeshes.current[participant.user_id]) {
        // Create new avatar
        const avatarGroup = new THREE.Group();

        // Body (capsule-like)
        const bodyGeometry = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({
          color: color,
          metalness: 0.6,
          roughness: 0.3,
          emissive: color,
          emissiveIntensity: isCurrentUser ? 0.3 : 0.1,
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.8;
        body.castShadow = true;
        avatarGroup.add(body);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 1.6;
        head.castShadow = true;
        avatarGroup.add(head);

        avatarGroup.position.set(x, y, z);
        sceneRef.current.add(avatarGroup);
        avatarMeshes.current[participant.user_id] = avatarGroup;
      } else {
        // Update position
        avatarMeshes.current[participant.user_id].position.set(x, y, z);
      }

      // Update hand raised indicator
      const avatarGroup = avatarMeshes.current[participant.user_id];
      const existingHand = avatarGroup.getObjectByName('handIndicator');
      
      if (participant.is_hand_raised && !existingHand) {
        const handGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const handMaterial = new THREE.MeshStandardMaterial({
          color: 0xeab308,
          emissive: 0xeab308,
          emissiveIntensity: 0.5,
        });
        const hand = new THREE.Mesh(handGeometry, handMaterial);
        hand.position.set(0.5, 2.2, 0);
        hand.name = 'handIndicator';
        avatarGroup.add(hand);
      } else if (!participant.is_hand_raised && existingHand) {
        avatarGroup.remove(existingHand);
      }
    });
  }, [participants, currentUserId]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ touchAction: 'none' }}
    />
  );
};

export default ClassroomScene;
