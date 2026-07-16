import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';

type BarcodeDetectedHandler = (code: string) => void | Promise<void>;

interface UseBarcodeScannerOptions {
  onDetected: BarcodeDetectedHandler;
}

const cameraErrorMessage = (error: unknown): string => {
  const value = error as { name?: string; message?: string };
  const name = value?.name || '';
  const message = value?.message || '';

  if (name === 'NotAllowedError' || /permission|denied|notallowed/i.test(message)) {
    return "Permission caméra refusée. Autorisez la caméra dans les paramètres de l'application.";
  }
  if (name === 'NotFoundError' || /notfound|device not found/i.test(message)) {
    return 'Aucune caméra détectée sur cet appareil.';
  }
  if (name === 'NotReadableError') {
    return 'La caméra est déjà utilisée par une autre application.';
  }
  if (name === 'OverconstrainedError') {
    return 'La caméra disponible ne prend pas en charge les réglages demandés.';
  }
  return "Impossible d'ouvrir la caméra sur cet appareil.";
};

export const useBarcodeScanner = ({ onDetected }: UseBarcodeScannerOptions) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const activeRef = useRef(false);
  const detectedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    activeRef.current = false;
    detectedRef.current = false;
    controlsRef.current?.stop();
    controlsRef.current = null;
    BrowserMultiFormatReader.releaseAllStreams();

    const video = videoRef.current;
    const stream = video?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (video) video.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    stop();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("La caméra n'est pas disponible. Utilisez l'application HTTPS ou mettez à jour Android System WebView.");
      return;
    }
    if (!videoRef.current) {
      setError("La zone d'affichage de la caméra n'est pas prête.");
      return;
    }

    try {
      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();
      activeRef.current = true;
      detectedRef.current = false;

      const controls = await readerRef.current.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (result, scanError, scannerControls) => {
          if (!activeRef.current || detectedRef.current) return;
          if (result) {
            const code = result.getText().trim();
            if (!code) return;
            detectedRef.current = true;
            activeRef.current = false;
            scannerControls.stop();
            void onDetected(code);
          } else if (scanError && !(scanError instanceof NotFoundException)) {
            console.warn('[barcode-scanner]', scanError);
          }
        },
      );

      if (activeRef.current) {
        controlsRef.current = controls;
      } else {
        controls.stop();
      }
    } catch (scanError) {
      stop();
      setError(cameraErrorMessage(scanError));
    }
  }, [onDetected, stop]);

  useEffect(() => stop, [stop]);

  return {
    videoRef,
    error,
    clearError: () => setError(null),
    start,
    stop,
  };
};
