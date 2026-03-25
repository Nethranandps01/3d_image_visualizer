import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { IonIcon, IonFab, IonFabButton } from '@ionic/react';
import { addOutline, checkmarkOutline, refreshOutline, closeOutline } from 'ionicons/icons';
import { Vector3D, calculate3DDistance, toCm } from '../services/ar';

interface ARViewProps {
  onConfirm: (dimensions: { width: number; height: number; length: number }) => void;
  onClose: () => void;
}

const ARView: React.FC<ARViewProps> = ({ onConfirm, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [points, setPoints] = useState<Vector3D[]>([]);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const markersRef = useRef<THREE.Group | null>(null);
  const linesRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Initialize Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 5); // Angle the camera down for a better 3D view
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Initialize Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Groups for organization
    const markers = new THREE.Group();
    scene.add(markers);
    markersRef.current = markers;

    const lines = new THREE.Group();
    scene.add(lines);
    linesRef.current = lines;

    // --- NEW: Ground Grid ---
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    gridHelper.position.y = -2; // Simulate a floor
    scene.add(gridHelper);

    // --- NEW: Box Projection Support ---
    const boxGroup = new THREE.Group();
    scene.add(boxGroup);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  const addPoint = useCallback(() => {
    if (!cameraRef.current || !sceneRef.current || !markersRef.current) return;

    // Simulate placing a point on the ground plane
    // For this foundational version, we place points at Y = -2 (the grid level)
    const vector = new THREE.Vector3(
      (Math.random() - 0.5) * 4, // Random X spread
      -2,                         // Fixed Y (floor)
      (Math.random() - 0.5) * 4  // Random Z spread
    );
    
    const newPoint: Vector3D = { x: vector.x, y: vector.y, z: vector.z };
    const newPoints = [...points, newPoint];
    setPoints(newPoints);

    // Add visual marker (Premium Sphere)
    const geometry = new THREE.SphereGeometry(0.08, 32, 32);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x3b82f6, 
      emissive: 0x1d4ed8,
      shininess: 100 
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(vector);
    markersRef.current.add(sphere);

    // --- NEW: Dynamic Bounding Box Projection ---
    if (newPoints.length >= 2) {
      // Clear old lines/box
      if (linesRef.current) linesRef.current.clear();

      // Create a Box encompassing all points
      const box = new THREE.Box3();
      newPoints.forEach(p => box.expandByPoint(new THREE.Vector3(p.x, p.y, p.z)));
      
      // If we have points at the same Y, give the box some height for visualization
      if (box.max.y === box.min.y) {
        box.max.y += 1.5; // Simulate 15cm height
      }

      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      const boxGeom = new THREE.BoxGeometry(size.x, size.y, size.z);
      const boxMat = new THREE.MeshPhongMaterial({ 
        color: 0x3b82f6, 
        transparent: true, 
        opacity: 0.2,
        side: THREE.DoubleSide
      });
      const boxMesh = new THREE.Mesh(boxGeom, boxMat);
      boxMesh.position.copy(center);
      
      // Add wireframe
      const wireframe = new THREE.BoxHelper(boxMesh, 0xffffff);
      
      if (linesRef.current) {
        linesRef.current.add(boxMesh);
        linesRef.current.add(wireframe);
      }

      // Calculate the most relevant distance (e.g. width)
      const p1 = newPoints[0];
      const p2 = newPoints[newPoints.length - 1];
      const dist = calculate3DDistance(p1, p2);
      setCurrentDistance(toCm(dist));
    }
  }, [points]);

  const handleReset = () => {
    setPoints([]);
    setCurrentDistance(null);
    if (markersRef.current) markersRef.current.clear();
    if (linesRef.current) linesRef.current.clear();
  };

  const handleConfirm = () => {
    if (points.length >= 2) {
      // Mock dimensions for demo
      onConfirm({
        width: currentDistance || 10,
        height: 15,
        length: 20
      });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000' }}>
      {/* Background Camera Feed (In a real app, this would be the ARCore/WebXR feed) */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'linear-gradient(45deg, #1e293b, #0f172a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
          AR Camera Feed Active...
        </p>
      </div>

      {/* Three.js Canvas Container */}
      <div ref={containerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

      {/* Overlay UI */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <IonFabButton size="small" color="light" onClick={onClose} style={{ '--background': 'rgba(255,255,255,0.2)', '--backdrop-filter': 'blur(10px)' }}>
            <IonIcon icon={closeOutline} />
          </IonFabButton>
          
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '8px 16px', borderRadius: '20px', backdropFilter: 'blur(10px)', color: 'white' }}>
            {points.length === 0 ? 'Point to a corner' : `Point ${points.length} placed`}
          </div>
          
          <IonFabButton size="small" color="light" onClick={handleReset} style={{ '--background': 'rgba(255,255,255,0.2)', '--backdrop-filter': 'blur(10px)' }}>
            <IonIcon icon={refreshOutline} />
          </IonFabButton>
        </div>
      </div>

      {/* Center Reticle */}
      <div style={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        width: '20px',
        height: '20px',
        border: '2px solid rgba(255,255,255,0.8)',
        borderRadius: '50%',
        zIndex: 5,
        pointerEvents: 'none'
      }}>
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          width: '4px',
          height: '4px',
          background: '#007aff',
          borderRadius: '50%'
        }} />
      </div>

      {/* Action Fab */}
      <IonFab vertical="bottom" horizontal="center" slot="fixed" style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {points.length > 0 && (
             <div style={{ 
               background: 'rgba(0,0,0,0.8)', 
               padding: '10px 20px', 
               borderRadius: '16px', 
               color: 'white', 
               fontWeight: '600',
               fontSize: '18px',
               backdropFilter: 'blur(10px)',
               border: '1px solid rgba(255,255,255,0.1)'
             }}>
               {currentDistance || '0'} cm
             </div>
          )}
          
          <IonFabButton 
             onClick={addPoint} 
             style={{ 
               '--background': '#ffffff', 
               '--color': '#0f172a',
               width: '80px',
               height: '80px'
             }}
          >
            <IonIcon icon={addOutline} style={{ fontSize: '32px' }} />
          </IonFabButton>

          {points.length >= 2 && (
             <IonFabButton 
               color="success" 
               onClick={handleConfirm}
               style={{ width: '60px', height: '60px' }}
             >
               <IonIcon icon={checkmarkOutline} style={{ fontSize: '28px' }} />
             </IonFabButton>
          )}
        </div>
      </IonFab>
      
      {/* Instructions */}
      <div style={{ 
        position: 'absolute', 
        bottom: '140px', 
        left: '20px', 
        right: '20px', 
        textAlign: 'center',
        padding: '10px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '12px',
        color: 'white',
        fontSize: '13px'
      }}>
        Move camera to see depth. Taps add markers.
      </div>
    </div>
  );
};

export default ARView;
