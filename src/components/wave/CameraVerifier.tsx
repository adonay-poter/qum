import { useCallback, useRef, useState } from 'react';
import { captureProofPhoto, requestCameraPermission } from '@/services/cameraService';
import { isNativeApp } from '@/lib/platform/native';

interface CameraVerifierProps {
  onCapture: (dataUrl: string) => void;
  disabled?: boolean;
}

export function CameraVerifier({ onCapture, disabled }: CameraVerifierProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const clearPreview = useCallback(() => {
    setPreview(null);
  }, []);

  const nativeCapture = useCallback(async () => {
    setBusy(true);
    const allowed = await requestCameraPermission();
    if (!allowed) {
      setBusy(false);
      return;
    }
    const dataUrl = await captureProofPhoto();
    setBusy(false);
    if (dataUrl) {
      setPreview(dataUrl);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreamActive(true);
    } catch (err) {
      console.error('Camera access denied', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreamActive(false);
  }, []);

  const captureWeb = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreview(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const submitPreview = () => {
    if (preview) onCapture(preview);
  };

  if (preview) {
    return (
      <div className="mt-qum-lg flex flex-col gap-qum-md">
        <img
          src={preview}
          alt="Proof capture"
          className="max-h-64 w-full border border-secondary/40 object-cover"
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={submitPreview}
            disabled={disabled || busy}
            className="flex-1 bg-tertiary px-5 py-3 text-body font-semibold text-on-primary disabled:opacity-40"
          >
            Submit proof
          </button>
          <button
            type="button"
            onClick={clearPreview}
            disabled={disabled || busy}
            className="flex-1 border border-secondary/40 px-5 py-3 text-body text-primary disabled:opacity-40"
          >
            Retake
          </button>
        </div>
      </div>
    );
  }

  if (isNativeApp()) {
    return (
      <div className="mt-qum-lg flex flex-col gap-qum-md">
        <button
          type="button"
          onClick={() => void nativeCapture()}
          disabled={disabled || busy}
          className="bg-tertiary px-5 py-3 text-body font-semibold text-on-primary disabled:opacity-40"
        >
          {busy ? 'Opening camera…' : 'Take photo with camera'}
        </button>
        <p className="text-label uppercase text-secondary">
          Uses device camera · proof stays on device until validated
        </p>
      </div>
    );
  }

  return (
    <div className="mt-qum-lg flex flex-col gap-qum-md">
      <video
        ref={videoRef}
        playsInline
        muted
        className="max-h-64 w-full border border-secondary/40 bg-surface object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      {!streamActive ? (
        <button
          type="button"
          onClick={startCamera}
          disabled={disabled}
          className="border border-secondary/40 bg-surface px-5 py-3 text-body text-primary disabled:opacity-40"
        >
          Open camera
        </button>
      ) : (
        <button
          type="button"
          onClick={captureWeb}
          disabled={disabled}
          className="bg-tertiary px-5 py-3 text-body font-semibold text-on-primary disabled:opacity-40"
        >
          Capture proof
        </button>
      )}
    </div>
  );
}
