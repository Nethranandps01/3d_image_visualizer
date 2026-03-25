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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [points, setPoints] = useState<Vector3D[]>([]);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const markersRef = useRef<THREE.Group | null>(null);
  const linesRef = useRef<THREE.Group | null>(null);

  // --- NEW: Camera Feed Initialization ---
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
      }
    };
    startCamera();
    
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

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
    camera.position.set(0, 0, 5); 
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

    // Ground Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

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

    // Place point at center of view
    const vector = new THREE.Vector3(0, 0, -3); 
    vector.unproject(cameraRef.current);
    
    const newPoint: Vector3D = { x: vector.x, y: vector.y, z: vector.z };
    const newPoints = [...points, newPoint];
    setPoints(newPoints);

    // Add visual marker
    const geometry = new THREE.SphereGeometry(0.08, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0x3b82f6 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(vector);
    markersRef.current.add(sphere);

    // Dynamic Bounding Box Projection
    if (newPoints.length >= 2) {
      if (linesRef.current) linesRef.current.clear();
      const box = new THREE.Box3();
      newPoints.forEach(p => box.expandByPoint(new THREE.Vector3(p.x, p.y, p.z)));
      if (box.max.y === box.min.y) box.max.y += 1.5;

      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      const boxGeom = new THREE.BoxGeometry(size.x, size.y, size.z);
      const boxMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.2 });
      const boxMesh = new THREE.Mesh(boxGeom, boxMat);
      boxMesh.position.copy(center);
      const wireframe = new THREE.BoxHelper(boxMesh, 0xffffff);
      
      if (linesRef.current) {
        linesRef.current.add(boxMesh);
        linesRef.current.add(wireframe);
      }

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
      onConfirm({
        width: currentDistance || 10,
        height: 15,
        length: 20
      });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000' }}>
      {/* REAL CAMERA FEED */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 1
        }}
      />

      {/* Three.js Canvas Container */}
      <div 
        ref={containerRef} 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%',
          zIndex: 2
        }} 
      />

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
        width: '30px',
        height: '30px',
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
          width: '6px',
          height: '6px',
          background: '#3b82f6',
          borderRadius: '50%'
        }} />
      </div>

      {/* Action Fab */}
      <IonFab vertical="bottom" horizontal="center" slot="fixed" style={{ marginBottom: '40px', zIndex: 20 }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center' }}>
          {points.length > 0 && (
             <div style={{ 
               background: 'rgba(0,0,0,0.8)', 
               padding: '10px 20px', 
               borderRadius: '16px', 
               color: 'white', 
               fontWeight: '700',
               fontSize: '20px',
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
            <IonIcon icon={addOutline} style={{ fontSize: '40px' }} />
          </IonFabButton>

          {points.length >= 2 && (
             <IonFabButton 
               color="success" 
               onClick={handleConfirm}
               style={{ width: '60px', height: '60px' }}
             >
               <IonIcon icon={checkmarkOutline} style={{ fontSize: '32px' }} />
             </IonFabButton>
          )}
        </div>
      </IonFab>
      
      {/* Instructions */}
      <div style={{ 
        position: 'absolute', 
        bottom: '140px', 
        left: '0', 
        right: '0', 
        textAlign: 'center',
        padding: '0 20px',
        zIndex: 10
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.6)',
          padding: '10px 20px',
          borderRadius: '12px',
          display: 'inline-block',
          color: 'white',
          fontSize: '14px',
          backdropFilter: 'blur(5px)'
        }}>
          Move camera to align reticle. Taps add 3D markers.
        </div>
      </div>
    </div>
  );
};

export default ARView;
