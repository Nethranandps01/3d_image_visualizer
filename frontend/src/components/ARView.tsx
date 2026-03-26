import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { IonIcon, IonFabButton } from '@ionic/react';
import { addOutline, checkmarkOutline, refreshOutline, closeOutline, cubeOutline } from 'ionicons/icons';
import { Vector3D, toCm } from '../services/ar';

interface ARViewProps {
  onConfirm: (dimensions: { width: number; height: number; length: number }) => void;
  onClose: () => void;
}

const ARView: React.FC<ARViewProps> = ({ onConfirm, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [points, setPoints] = useState<Vector3D[]>([]);
  const [dims, setDims] = useState({ l: 0, b: 0, h: 0 });
  const [scaleFactor, setScaleFactor] = useState(11); // Initial scale multiplier set to 11
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const markersRef = useRef<THREE.Group | null>(null);
  const linesRef = useRef<THREE.Group | null>(null);

  // ... (Camera Feed and Three.js init remains same)

  // Camera Feed Logic
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
            setIsPlaying(true);
          } catch (e) {
            console.error("Auto-play blocked:", e);
            setIsPlaying(false);
          }
        }
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : String(err));
        console.error("Error accessing camera: ", err);
      }
    };
    startCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleManualPlay = async () => {
    if (videoRef.current) {
      try {
        await videoRef.current.play();
        setIsPlaying(true);
      } catch (e) {
        console.error("Manual play failed:", e);
      }
    }
  };

  // Three.js Initialization
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5); 
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const markers = new THREE.Group();
    scene.add(markers);
    markersRef.current = markers;

    const lines = new THREE.Group();
    scene.add(lines);
    linesRef.current = lines;

    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    // --- NEW: Motion Tracking ---
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!cameraRef.current) return;
      const alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0; // Z
      const beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;   // X
      const gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0; // Y

      // Simple rotation mapping
      cameraRef.current.rotation.set(beta, alpha, -gamma, 'YXZ');
    };

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    const animate = () => {
      requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) rendererRef.current.dispose();
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  const addPoint = useCallback(() => {
    if (!cameraRef.current || !sceneRef.current || !markersRef.current || points.length >= 4) return;

    const vector = new THREE.Vector3(0, 0, -5); 
    vector.unproject(cameraRef.current);
    
    const newPoint: Vector3D = { x: vector.x, y: vector.y, z: vector.z };
    const newPoints = [...points, newPoint];
    setPoints(newPoints);

    const geometry = new THREE.SphereGeometry(0.1, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0x3b82f6 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(vector);
    markersRef.current.add(sphere);

    if (linesRef.current) linesRef.current.clear();

    const p1 = newPoints[0];
    let l = dims.l, b = dims.b, h = dims.h;

    if (newPoints.length === 2) {
      // Point 2: Length (X displacement)
      l = toCm(Math.abs(newPoints[1].x - p1.x) * scaleFactor);
    } else if (newPoints.length === 3) {
      // Point 3: Breadth (Y displacement)
      l = toCm(Math.abs(newPoints[1].x - p1.x) * scaleFactor);
      b = toCm(Math.abs(newPoints[2].y - p1.y) * scaleFactor);
    } else if (newPoints.length === 4) {
      // Point 4: Height (Z displacement)
      l = toCm(Math.abs(newPoints[1].x - p1.x) * scaleFactor);
      b = toCm(Math.abs(newPoints[2].y - p1.y) * scaleFactor);
      h = toCm(Math.abs(newPoints[3].z - p1.z) * scaleFactor);
    }
    setDims({ l, b, h });

    // 3D Visualization Logic
    if (newPoints.length >= 2) {
      const box = new THREE.Box3();
      
      // We'll create a box that grows based on the points
      const p1Vec = new THREE.Vector3(p1.x, p1.y, p1.z);
      box.expandByPoint(p1Vec);

      if (newPoints.length === 2) {
        // Just show a line for length
        const p2Vec = new THREE.Vector3(newPoints[1].x, p1.y, p1.z);
        box.expandByPoint(p2Vec);
      } else if (newPoints.length === 3) {
        // Show a rectangle for base (Length x Breadth)
        const p2Vec = new THREE.Vector3(newPoints[1].x, p1.y, p1.z);
        const p3Vec = new THREE.Vector3(newPoints[1].x, newPoints[2].y, p1.z);
        box.expandByPoint(p2Vec);
        box.expandByPoint(p3Vec);
        box.expandByPoint(new THREE.Vector3(p1.x, newPoints[2].y, p1.z));
      } else if (newPoints.length === 4) {
        // Show the full 3D box
        const p2Vec = new THREE.Vector3(newPoints[1].x, p1.y, p1.z);
        const p3Vec = new THREE.Vector3(newPoints[1].x, newPoints[2].y, p1.z);
        const p4Vec = new THREE.Vector3(newPoints[1].x, newPoints[2].y, newPoints[3].z);
        
        box.expandByPoint(p2Vec);
        box.expandByPoint(p3Vec);
        box.expandByPoint(p4Vec);
        // Expand by all corners
        box.expandByPoint(new THREE.Vector3(p1.x, p1.y, newPoints[3].z));
        box.expandByPoint(new THREE.Vector3(newPoints[1].x, p1.y, newPoints[3].z));
        box.expandByPoint(new THREE.Vector3(p1.x, newPoints[2].y, p1.z));
        box.expandByPoint(new THREE.Vector3(p1.x, newPoints[2].y, newPoints[3].z));
      }

      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      // Ensure size is non-zero for geometry creation
      const boxGeom = new THREE.BoxGeometry(
        Math.max(size.x, 0.01), 
        Math.max(size.y, 0.01), 
        Math.max(size.z, 0.01)
      );
      const boxMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.3 });
      const boxMesh = new THREE.Mesh(boxGeom, boxMat);
      boxMesh.position.copy(center);
      const wireframe = new THREE.BoxHelper(boxMesh, 0xffffff);
      
      if (linesRef.current) {
        linesRef.current.add(boxMesh);
        linesRef.current.add(wireframe);
      }
    }
  }, [points, scaleFactor, dims]);

  const handleReset = () => {
    setPoints([]);
    setDims({ l: 0, b: 0, h: 0 });
    if (markersRef.current) markersRef.current.clear();
    if (linesRef.current) linesRef.current.clear();
  };

  const handleConfirm = () => {
    if (points.length >= 4) {
      onConfirm({
        width: dims.b,
        height: dims.h,
        length: dims.l
      });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000' }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onPlay={() => setIsPlaying(true)}
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

      {!isPlaying && !cameraError && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 5,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center'
        }}>
           <IonIcon icon={cubeOutline} style={{ fontSize: '60px', color: '#3b82f6', marginBottom: '20px' }} />
           <p style={{ color: 'white', marginBottom: '24px', fontSize: '18px' }}>Ready for 3D Measurement</p>
           <button 
             onClick={handleManualPlay}
             style={{
               padding: '16px 32px',
               background: '#ffffff',
               color: '#000',
               borderRadius: '16px',
               fontSize: '20px',
               fontWeight: '800',
               border: 'none',
               boxShadow: '0 10px 30px rgba(255,255,255,0.2)'
             }}
           >
             Enable Camera
           </button>
        </div>
      )}

      {cameraError && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center'
        }}>
           <IonIcon icon={closeOutline} style={{ fontSize: '60px', color: '#ef4444', marginBottom: '20px' }} />
           <p style={{ color: 'white' }}>
             Camera Error: {cameraError}<br/>
             Please grant camera permissions in settings.
           </p>
        </div>
      )}

      {/* Header Overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '20px', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <IonFabButton size="small" color="light" onClick={onClose} style={{ '--background': 'rgba(255,255,255,0.2)', '--backdrop-filter': 'blur(10px)' }}>
            <IonIcon icon={closeOutline} />
          </IonFabButton>
          
          <div style={{ 
            background: 'rgba(0,0,0,0.6)', 
            padding: '10px 20px', 
            borderRadius: '24px', 
            backdropFilter: 'blur(10px)', 
            color: 'white',
            border: '1px solid rgba(255,255,255,0.1)',
            fontWeight: '600'
          }}>
            {points.length === 0 ? 'Step 1: Mark Base Point' : 
             points.length === 1 ? 'Step 2: Mark Length' :
             points.length === 2 ? 'Step 3: Mark Breadth' :
             points.length === 3 ? 'Step 4: Mark Height' :
             'Measurement Complete'}
          </div>

          <IonFabButton size="small" color="light" onClick={handleReset} style={{ '--background': 'rgba(255,255,255,0.2)', '--backdrop-filter': 'blur(10px)' }}>
            <IonIcon icon={refreshOutline} />
          </IonFabButton>
        </div>
      </div>

      {/* LBH Real-time Dimensions Overlay */}
      {points.length >= 2 && (
        <div style={{
          position: 'absolute',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '400px',
          background: 'rgba(15, 23, 42, 0.9)',
          borderRadius: '24px',
          padding: '16px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          backdropFilter: 'blur(15px)',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Length</div>
            <div style={{ color: points.length >= 2 ? '#3b82f6' : '#475569', fontSize: '20px', fontWeight: '800' }}>{dims.l} <span style={{fontSize: '12px'}}>cm</span></div>
          </div>
          <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Breadth</div>
            <div style={{ color: points.length >= 3 ? '#3b82f6' : '#475569', fontSize: '20px', fontWeight: '800' }}>{dims.b} <span style={{fontSize: '12px'}}>cm</span></div>
          </div>
          <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Height</div>
            <div style={{ color: points.length >= 4 ? '#3b82f6' : '#475569', fontSize: '20px', fontWeight: '800' }}>{dims.h} <span style={{fontSize: '12px'}}>cm</span></div>
          </div>
        </div>
      )}

      {/* Center Reticle */}
      <div style={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        width: '40px',
        height: '40px',
        border: '2.5px solid rgba(255,255,255,0.9)',
        borderRadius: '50%',
        zIndex: 5,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          width: '6px',
          height: '6px',
          background: '#3b82f6',
          borderRadius: '50%',
          boxShadow: '0 0 10px #3b82f6'
        }} />
      </div>

      {/* Main Action Bar */}
      <div style={{ position: 'absolute', bottom: '40px', left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px', zIndex: 20 }}>
          <IonFabButton 
            onClick={addPoint} 
            disabled={points.length >= 4}
            style={{ 
              '--background': points.length >= 4 ? '#475569' : '#ffffff', 
              '--color': '#0f172a',
              width: '90px',
              height: '90px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}
          >
            <IonIcon icon={addOutline} style={{ fontSize: '45px' }} />
          </IonFabButton>

          {points.length >= 4 && (
             <IonFabButton 
               color="success" 
               onClick={handleConfirm}
               style={{ 
                 width: '65px', 
                 height: '65px',
                 '--background': '#22c55e',
                 boxShadow: '0 10px 20px rgba(34, 197, 94, 0.4)'
               }}
             >
               <IonIcon icon={checkmarkOutline} style={{ fontSize: '35px' }} />
             </IonFabButton>
          )}
      </div>
      
      {/* Dynamic Hint & Scale Control */}
      <div style={{ 
        position: 'absolute', 
        bottom: '150px', 
        left: '0', 
        right: '0', 
        textAlign: 'center',
        padding: '0 20px',
        zIndex: 10
      }}>
        {points.length > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '15px',
            marginBottom: '15px'
          }}>
            <button 
              onClick={() => setScaleFactor(prev => Math.max(0.1, prev - 0.2))}
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px' }}>-</button>
            <div style={{ color: 'white', background: 'rgba(0,0,0,0.5)', padding: '5px 15px', borderRadius: '15px' }}>
              Scale: {scaleFactor.toFixed(1)}x
            </div>
            <button 
              onClick={() => setScaleFactor(prev => prev + 0.2)}
              style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px' }}>+</button>
          </div>
        )}
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          padding: '12px 24px',
          borderRadius: '16px',
          display: 'inline-block',
          color: 'white',
          fontSize: '15px',
          fontWeight: '500',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {points.length === 0 ? "Align reticle and mark base point" : 
           points.length === 1 ? "Move and mark the length" :
           points.length === 2 ? "Move and mark the breadth" :
           points.length === 3 ? "Move and mark the height" :
           "Confirm measurement"}
        </div>
      </div>
    </div>
  );
};

export default ARView;
