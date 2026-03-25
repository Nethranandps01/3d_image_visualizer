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

      {/* Result Image */}
      {resultImage && (
        <IonCard style={{
          margin: '0 0 16px 0',
          borderRadius: '20px',
          overflow: 'hidden',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
        }}>
          <img 
            src={resultImage} 
            alt="Measurement result" 
            style={{ width: '100%', display: 'block' }}
          />
        </IonCard>
      )}

      {/* Measurements List */}
      {measurements.length > 0 && (
        <IonCard style={{
          margin: '0 0 16px 0',
          borderRadius: '20px',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
        }}>
          <IonCardContent>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
            }}>
              <IonIcon icon={checkmarkCircle} style={{ color: '#16a34a', fontSize: '24px' }} />
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '20px' }}>
                Measurements
              </h2>
            </div>
            
            {measurements.map((obj, index) => (
              <div
                key={index}
                style={{
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: index < measurements.length - 1 ? '12px' : 0,
                  border: '1px solid #e2e8f0',
                }}
              >
                <IonChip style={{
                  '--background': '#0f172a',
                  '--color': 'white',
                  marginBottom: '12px',
                }}>
                  Object {index + 1}
                </IonChip>
                
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: '#0f172a',
                    }}>
                      {obj.width_cm}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                      Width (cm)
                    </div>
                  </div>
                  <div style={{
                    width: '1px',
                    background: 'rgba(255,255,255,0.1)',
                  }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: '#0f172a',
                    }}>
                      {obj.height_cm}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '13px' }}>
                      Height (cm)
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </IonCardContent>
        </IonCard>
      )}

      {/* Error Message */}
      {errorMessage && !measurements.length && (
        <IonCard style={{
          margin: '0 0 16px 0',
          borderRadius: '20px',
          background: '#fff1f2',
          border: '1px solid #fecdd3',
        }}>
          <IonCardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IonIcon icon={alertCircle} style={{ fontSize: '32px', color: '#dc2626' }} />
              <div>
                <h3 style={{ margin: '0 0 4px 0', color: '#0f172a' }}>Detection Failed</h3>
                <p style={{ margin: 0, color: '#475569' }}>{errorMessage}</p>
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
        <IonButton
          expand="block"
          onClick={handleReset}
          fill="outline"
          style={{
            flex: 1,
            '--border-radius': '14px',
            '--border-color': '#cbd5e1',
            '--color': '#0f172a',
            height: '50px',
          }}
        >
          <IonIcon slot="start" icon={refreshOutline} />
          Reset
        </IonButton>
        
        <IonButton
          expand="block"
          onClick={handleCapturePhoto}
          style={{
            flex: 2,
            '--background': '#0f172a',
            '--color': '#ffffff',
            '--border-radius': '14px',
            height: '50px',
          }}
        >
          <IonIcon slot="start" icon={camera} />
          New Photo
        </IonButton>
      </div>
    </div>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{
          '--background': '#ffffff',
          '--color': '#0f172a',
          '--border-color': '#e5e7eb',
        }}>
          <IonTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={scanOutline} />
              Object Measure
            </div>
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen style={{ '--background': '#f5f7fb' }}>
        {/* Loading Overlay */}
        {isLoading && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}>
            <IonSpinner name="crescent" style={{ width: '60px', height: '60px', color: '#0f172a' }} />
            <p style={{ color: 'white', marginTop: '20px', fontSize: '16px' }}>{loadingText}</p>
          </div>
        )}

        {/* Main Content */}
        {isARMode ? (
          <ARView 
            onConfirm={handleARConfirm} 
            onClose={() => setIsARMode(false)} 
          />
        ) : (
          !capturedImage && !resultImage ? renderLandingScreen() : renderResults()
        )}
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
