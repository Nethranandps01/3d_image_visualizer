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
  IonText,
  IonFab,
  IonFabButton,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail,
  useIonToast,
  IonActionSheet,
} from '@ionic/react';
import {
  camera,
  images,
  refresh,
  checkmarkCircle,
  alertCircle,
  documentTextOutline,
} from 'ionicons/icons';
import { useState, useCallback } from 'react';
import { capturePhoto, pickFromGallery } from '../services/camera';
import { measureImage, MeasurementResponse, MeasuredObject } from '../services/api';

const HomePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing...');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<MeasuredObject[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  
  const [presentToast] = useIonToast();

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
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        return; // User cancelled, do nothing
      }
      const message = error instanceof Error ? error.message : 'Failed to capture photo';
      showToast(message, 'danger');
    }
  }, [processImage, showToast]);

  const handlePickFromGallery = useCallback(async () => {
    try {
      const image = await pickFromGallery();
      await processImage(image.base64String, image.dataUrl);
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        return; // User cancelled, do nothing
      }
      const message = error instanceof Error ? error.message : 'Failed to load image';
      showToast(message, 'danger');
    }
  }, [processImage, showToast]);

  const handleRefresh = useCallback((event: CustomEvent<RefresherEventDetail>) => {
    setCapturedImage(null);
    setResultImage(null);
    setMeasurements([]);
    setErrorMessage(null);
    event.detail.complete();
  }, []);

  const renderEmptyState = () => (
    <div className="empty-state">
      <IonIcon icon={camera} />
      <h3>Measure Objects</h3>
      <p>
        Place objects on an A4 paper and take a photo to measure their dimensions
      </p>
      <IonButton 
        onClick={() => setShowActionSheet(true)}
        style={{ marginTop: '20px' }}
      >
        <IonIcon slot="start" icon={camera} />
        Get Started
      </IonButton>
    </div>
  );

  const renderInstructions = () => (
    <IonCard className="measurement-card">
      <IonCardContent>
        <div className="instructions">
          <IonIcon 
            icon={documentTextOutline} 
            style={{ fontSize: '48px', color: 'var(--ion-color-primary)' }} 
          />
          <h2>How to Use</h2>
          <ol className="instructions-list">
            <li>Place a white <strong>A4 paper</strong> on a flat surface</li>
            <li>Put the objects you want to measure <strong>on the paper</strong></li>
            <li>Take a photo with <strong>good lighting</strong></li>
            <li>Make sure the <strong>entire paper is visible</strong></li>
            <li>Objects should be <strong>rectangular</strong> for best results</li>
          </ol>
        </div>
      </IonCardContent>
    </IonCard>
  );

  const renderResults = () => (
    <>
      {/* Result Image */}
      {resultImage && (
        <IonCard className="measurement-card">
          <IonCardContent style={{ padding: '8px' }}>
            <img 
              src={resultImage} 
              alt="Measurement result" 
              className="result-image"
            />
          </IonCardContent>
        </IonCard>
      )}

      {/* Measurements List */}
      {measurements.length > 0 && (
        <IonCard className="measurement-card">
          <IonCardContent>
            <IonText>
              <h2 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={checkmarkCircle} color="success" />
                Measurements
              </h2>
            </IonText>
            <IonList>
              {measurements.map((obj, index) => (
                <IonItem key={index} className="object-item">
                  <IonLabel>
                    <IonChip color="primary">Object {index + 1}</IonChip>
                    <div className="object-dimensions" style={{ marginTop: '12px' }}>
                      <div className="dimension">
                        <div className="dimension-value">{obj.width_cm}</div>
                        <div className="dimension-label">Width (cm)</div>
                      </div>
                      <div className="dimension">
                        <div className="dimension-value">{obj.height_cm}</div>
                        <div className="dimension-label">Height (cm)</div>
                      </div>
                    </div>
                  </IonLabel>
                </IonItem>
              ))}
            </IonList>
          </IonCardContent>
        </IonCard>
      )}

      {/* Error Message */}
      {errorMessage && !measurements.length && (
        <IonCard className="measurement-card" color="danger">
          <IonCardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IonIcon icon={alertCircle} style={{ fontSize: '32px' }} />
              <div>
                <IonText>
                  <h3 style={{ margin: '0 0 4px 0' }}>Detection Failed</h3>
                </IonText>
                <IonText>
                  <p style={{ margin: 0 }}>{errorMessage}</p>
                </IonText>
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      )}

      {/* Retry Button */}
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <IonButton 
          expand="block"
          onClick={() => setShowActionSheet(true)}
        >
          <IonIcon slot="start" icon={refresh} />
          Measure Again
        </IonButton>
      </div>
    </>
  );

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Object Measure</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Object Measure</IonTitle>
          </IonToolbar>
        </IonHeader>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <IonSpinner name="crescent" />
            <p>{loadingText}</p>
          </div>
        )}

        {/* Main Content */}
        {!capturedImage && !resultImage ? (
          <>
            {renderEmptyState()}
            {renderInstructions()}
          </>
        ) : (
          renderResults()
        )}

        {/* Floating Action Button */}
        {!isLoading && (capturedImage || resultImage) && (
          <IonFab vertical="bottom" horizontal="end" slot="fixed">
            <IonFabButton onClick={() => setShowActionSheet(true)}>
              <IonIcon icon={camera} />
            </IonFabButton>
          </IonFab>
        )}

        {/* Action Sheet for Camera/Gallery */}
        <IonActionSheet
          isOpen={showActionSheet}
          onDidDismiss={() => setShowActionSheet(false)}
          header="Select Image Source"
          buttons={[
            {
              text: 'Take Photo',
              icon: camera,
              handler: handleCapturePhoto,
            },
            {
              text: 'Choose from Gallery',
              icon: images,
              handler: handlePickFromGallery,
            },
            {
              text: 'Cancel',
              role: 'cancel',
            },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
