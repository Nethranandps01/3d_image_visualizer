import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonChip,
  useIonToast,
} from '@ionic/react';
import {
  camera,
  images,
  refreshOutline,
  checkmarkCircle,
  alertCircle,
  scanOutline,
} from 'ionicons/icons';
import { useState, useCallback, useEffect } from 'react';
import { capturePhoto, pickFromGallery, requestCameraPermission } from '../services/camera';
import { measureImage, MeasurementResponse, MeasuredObject } from '../services/api';
import ARView from '../components/ARView';

const HomePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing...');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<MeasuredObject[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isARMode, setIsARMode] = useState(false);
  
  const [presentToast] = useIonToast();

  // Request camera permission on mount
  useEffect(() => {
    requestCameraPermission();
  }, []);

  const showToast = useCallback((message: string, color: 'success' | 'danger' | 'warning' = 'success') => {
    presentToast({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
  }, [presentToast]);

  const processImage = useCallback(async (base64String: string, dataUrl: string) => {
    setIsLoading(true);
    setLoadingText('Detecting A4 paper...');
    setErrorMessage(null);
    setCapturedImage(dataUrl);
    setResultImage(null);
    setMeasurements([]);

    try {
      setLoadingText('Measuring objects...');
      const result: MeasurementResponse = await measureImage(base64String);

      if (result.success) {
        setMeasurements(result.objects);
        if (result.processed_image) {
          setResultImage(`data:image/jpeg;base64,${result.processed_image}`);
        }
        showToast(`Found ${result.objects.length} object(s)`, 'success');
      } else {
        setErrorMessage(result.message);
        showToast(result.message, 'warning');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process image';
      setErrorMessage(message);
      showToast(message, 'danger');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const handleCapturePhoto = useCallback(async () => {
    try {
      const image = await capturePhoto();
      await processImage(image.base64String, image.dataUrl);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message && (err.message.includes('cancelled') || err.message.includes('cancel'))) {
        return;
      }
      console.error('Camera error:', error);
      showToast(err.message || 'Failed to capture photo', 'danger');
    }
  }, [processImage, showToast]);

  const handlePickFromGallery = useCallback(async () => {
    try {
      const image = await pickFromGallery();
      await processImage(image.base64String, image.dataUrl);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message && (err.message.includes('cancelled') || err.message.includes('cancel'))) {
        return;
      }
      console.error('Gallery error:', error);
      showToast(err.message || 'Failed to load image', 'danger');
    }
  }, [processImage, showToast]);

  const handleReset = useCallback(() => {
    setCapturedImage(null);
    setResultImage(null);
    setMeasurements([]);
    setErrorMessage(null);
  }, []);

  const handleARConfirm = (dims: { width: number; height: number; length: number }) => {
    const newMeasurement: MeasuredObject = {
      width_cm: dims.width,
      height_cm: dims.height,
      bounding_box: [0, 0, 0, 0] // Mock bounding box for AR
    };
    
    // In AR mode, we might also want to store 'length' if we update the schema, 
    // but for now we'll stick to the 2D schema with an additional field if needed.
    setMeasurements([newMeasurement]);
    setIsARMode(false);
    showToast('3D Measurement Captured', 'success');
  };

  // Landing screen
  const renderLandingScreen = () => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100%',
      padding: '20px',
      background: '#0f172a', // Dark premium background
    }}>
      {/* Hero Section */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 20px',
      }}>
        <div style={{
          width: '140px',
          height: '140px',
          borderRadius: '40px',
          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '30px',
          boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)',
          position: 'relative',
        }}>
          <IonIcon icon={scanOutline} style={{ fontSize: '70px', color: '#ffffff' }} />
          <div style={{
            position: 'absolute',
            bottom: '-10px',
            right: '-10px',
            background: '#ffffff',
            borderRadius: '12px',
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: '700',
            color: '#0f172a',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
          }}>3D AR</div>
        </div>
        
        <h1 style={{
          color: '#ffffff',
          fontSize: '36px',
          fontWeight: '800',
          margin: '0 0 12px 0',
          letterSpacing: '-0.5px'
        }}>
          3D AR Measure
        </h1>
        
        <p style={{
          color: '#94a3b8',
          fontSize: '17px',
          margin: '0 0 40px 0',
          maxWidth: '300px',
          lineHeight: '1.6',
        }}>
          Capture real-world dimensions and volume instantly with spatial tracking
        </p>
      </div>

      {/* Instructions Card */}
      <div style={{
        background: 'rgba(30, 41, 59, 0.7)',
        borderRadius: '24px',
        padding: '24px',
        marginBottom: '28px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
      }}>
        <h3 style={{ color: '#ffffff', margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
          Spatial Marking
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { num: '🎚️', text: 'Point reticle at the floor & object' },
            { num: '📍', text: 'Tap [+] to mark object corners' },
            { num: '📦', text: 'Verify the 3D box projection' },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                fontSize: '20px',
                width: '32px',
                textAlign: 'center'
              }}>
                {step.num}
              </div>
                <span style={{ color: '#cbd5e1', fontSize: '15px', fontWeight: '500' }}>
                  {step.text}
                </span>
              </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '30px' }}>
        <IonButton
          expand="block"
          size="large"
          onClick={() => setIsARMode(true)}
          style={{
            '--background': '#ffffff',
            '--color': '#0f172a',
            '--border-radius': '20px',
            '--box-shadow': '0 15px 35px rgba(255, 255, 255, 0.1)',
            height: '64px',
            fontSize: '18px',
            fontWeight: '700',
          }}
        >
          <IonIcon slot="start" icon={scanOutline} />
          Start 3D AR Measurement
        </IonButton>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '8px 0'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', letterSpacing: '1px' }}>LEGACY MODE</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <IonButton
            expand="block"
            fill="clear"
            onClick={handleCapturePhoto}
            style={{
              flex: 1,
              '--color': '#94a3b8',
              '--border-radius': '16px',
              height: '50px',
              fontSize: '14px',
              fontWeight: '600',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <IonIcon slot="start" icon={camera} />
            2D Photo
          </IonButton>
          
          <IonButton
            expand="block"
            fill="clear"
            onClick={handlePickFromGallery}
            style={{
              flex: 1,
              '--color': '#94a3b8',
              '--border-radius': '16px',
              height: '50px',
              fontSize: '14px',
              fontWeight: '600',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <IonIcon slot="start" icon={images} />
            Gallery
          </IonButton>
        </div>
      </div>
    </div>
  );

  // Results screen
  const renderResults = () => (
    <div style={{ padding: '16px', background: '#f5f7fb', minHeight: '100%' }}>
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
