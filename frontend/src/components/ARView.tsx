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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Three.js refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const markersRef = useRef<THREE.Group | null>(null);
  const linesRef = useRef<THREE.Group | null>(null);

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
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) rendererRef.current.dispose();
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  const addPoint = useCallback(() => {
    if (!cameraRef.current || !sceneRef.current || !markersRef.current) return;

    // We place points at a fixed depth to simulate 3D marking
    const vector = new THREE.Vector3(0, 0, -3); 
    vector.unproject(cameraRef.current);
    
    const newPoint: Vector3D = { x: vector.x, y: vector.y, z: vector.z };
    const newPoints = [...points, newPoint];
    setPoints(newPoints);

    const geometry = new THREE.SphereGeometry(0.08, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0x3b82f6 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(vector);
    markersRef.current.add(sphere);

    if (newPoints.length >= 2) {
      if (linesRef.current) linesRef.current.clear();
      const box = new THREE.Box3();
      newPoints.forEach(p => box.expandByPoint(new THREE.Vector3(p.x, p.y, p.z)));
      
      // If only 2 points are placed, we give it a default height to show the volume
      if (newPoints.length === 2 && box.max.y === box.min.y) {
        box.max.y += 0.5; 
      }

      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      const boxGeom = new THREE.BoxGeometry(size.x, size.y, size.z);
      const boxMat = new THREE.MeshPhongMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.3 });
      const boxMesh = new THREE.Mesh(boxGeom, boxMat);
      boxMesh.position.copy(center);
      const wireframe = new THREE.BoxHelper(boxMesh, 0xffffff);
      
      if (linesRef.current) {
        linesRef.current.add(boxMesh);
        linesRef.current.add(wireframe);
      }

      // Calculate L, B, H in CM
      const l = toCm(size.x);
      const h = toCm(size.y);
      const b = toCm(size.z);
      setDims({ l, b, h });
    }
  }, [points]);

  const handleReset = () => {
    setPoints([]);
    setDims({ l: 0, b: 0, h: 0 });
    if (markersRef.current) markersRef.current.clear();
    if (linesRef.current) linesRef.current.clear();
  };

  const handleConfirm = () => {
    if (points.length >= 2) {
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
            {points.length === 0 ? 'Mark First Corner' : `Mark point ${points.length + 1}...`}
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
            <div style={{ color: '#3b82f6', fontSize: '20px', fontWeight: '800' }}>{dims.l} <span style={{fontSize: '12px'}}>cm</span></div>
          </div>
          <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Breadth</div>
            <div style={{ color: '#3b82f6', fontSize: '20px', fontWeight: '800' }}>{dims.b} <span style={{fontSize: '12px'}}>cm</span></div>
          </div>
          <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>Height</div>
            <div style={{ color: '#3b82f6', fontSize: '20px', fontWeight: '800' }}>{dims.h} <span style={{fontSize: '12px'}}>cm</span></div>
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
            style={{ 
              '--background': '#ffffff', 
              '--color': '#0f172a',
              width: '90px',
              height: '90px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}
          >
            <IonIcon icon={addOutline} style={{ fontSize: '45px' }} />
          </IonFabButton>

          {points.length >= 2 && (
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
      
      {/* Dynamic Hint */}
      <div style={{ 
        position: 'absolute', 
        bottom: '150px', 
        left: '0', 
        right: '0', 
        textAlign: 'center',
        padding: '0 20px',
        zIndex: 10
      }}>
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
          {points.length === 0 ? "Align reticle with the first corner" : "Mark another corner to see LBH"}
        </div>
      </div>
    </div>
  );
};

export default ARView;
