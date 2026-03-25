import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  useIonToast,
} from '@ionic/react';
import {
  scanOutline,
} from 'ionicons/icons';
import { useState, useEffect } from 'react';
import { requestCameraPermission } from '../services/camera';
import ARView from '../components/ARView';

const HomePage: React.FC = () => {
  const [isARMode, setIsARMode] = useState(false);
  const [presentToast] = useIonToast();

  // Request camera permission on mount
  useEffect(() => {
    requestCameraPermission();
  }, []);

  const handleARConfirm = (dims: { width: number; height: number; length: number }) => {
    presentToast({
      message: `3D Measurement: ${dims.width} x ${dims.length} x ${dims.height} cm`,
      duration: 5000,
      color: 'success',
      position: 'bottom',
    });
    setIsARMode(false);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{
          '--background': '#0f172a',
          '--color': '#ffffff',
          '--border-color': 'rgba(255,255,255,0.1)',
        }}>
          <IonTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={scanOutline} />
              3D AR Measure
            </div>
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen style={{ '--background': '#0f172a' }}>
        {isARMode ? (
          <ARView 
            onConfirm={handleARConfirm} 
            onClose={() => setIsARMode(false)} 
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '40px',
            textAlign: 'center',
            background: '#0f172a'
          }}>
            <div style={{
              width: '180px',
              height: '180px',
              borderRadius: '50px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '40px',
              boxShadow: '0 25px 50px rgba(59, 130, 246, 0.4)',
            }}>
              <IonIcon icon={scanOutline} style={{ fontSize: '90px', color: '#ffffff' }} />
            </div>

            <h1 style={{ color: '#ffffff', fontSize: '32px', fontWeight: '800', marginBottom: '16px' }}>
              Pro AR Measure
            </h1>
            
            <p style={{ color: '#94a3b8', fontSize: '18px', lineHeight: '1.6', marginBottom: '50px' }}>
              The most advanced 3D spatial measurement tool. No reference paper required.
            </p>

            <button
              onClick={() => setIsARMode(true)}
              style={{
                width: '100%',
                maxHeight: '70px',
                padding: '20px',
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '24px',
                fontSize: '20px',
                fontWeight: '700',
                border: 'none',
                boxShadow: '0 10px 30px rgba(255,255,255,0.1)'
              }}
            >
              🚀 Launch 3D Camera
            </button>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
