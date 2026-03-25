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
    camera.position.z = 5;
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

    // Lights
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

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

    // In a real AR app, this would use a Raycaster against a detected plane.
    // For this mock/foundational version, we place points at a fixed depth.
    const vector = new THREE.Vector3(0, 0, -3); // Place point 3 units in front
    vector.unproject(cameraRef.current);
    
    const newPoint: Vector3D = { x: vector.x, y: vector.y, z: vector.z };
    const newPoints = [...points, newPoint];
    setPoints(newPoints);

    // Add visual marker
    const geometry = new THREE.SphereGeometry(0.1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x007aff });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(vector.x, vector.y, vector.z);
    markersRef.current.add(sphere);

    // Draw line to previous point if exists
    if (newPoints.length > 1 && linesRef.current) {
      const prev = newPoints[newPoints.length - 2];
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(prev.x, prev.y, prev.z),
        new THREE.Vector3(newPoint.x, newPoint.y, newPoint.z)
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
      const line = new THREE.Line(lineGeom, lineMat);
      linesRef.current.add(line);
      
      const dist = calculate3DDistance(prev, newPoint);
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
