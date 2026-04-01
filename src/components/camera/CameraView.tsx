import { useRef, useEffect, useState, useCallback } from 'react';
import { LandmarkOverlay } from '../analysis/LandmarkOverlay';
import type { LandmarkSnapshot } from '../../types/analysis';

interface CameraViewProps {
  onFrame: (imageBitmap: ImageBitmap, timestamp: number) => void;
  isActive: boolean;
  landmarks: LandmarkSnapshot | null;
}

export function CameraView({ onFrame, isActive, landmarks }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const animationRef = useRef<number>(0);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 640, height: 480 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isActive || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }

    createImageBitmap(video).then((bitmap) => {
      onFrame(bitmap, performance.now());
    });

    animationRef.current = requestAnimationFrame(processFrame);
  }, [isActive, onFrame]);

  useEffect(() => {
    if (isActive) {
      animationRef.current = requestAnimationFrame(processFrame);
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [isActive, processFrame]);

  return (
    <div className="relative bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDimensions({ width: v.videoWidth, height: v.videoHeight });
        }}
        className="w-full"
      />
      <LandmarkOverlay landmarks={landmarks} width={dimensions.width} height={dimensions.height} />
    </div>
  );
}
