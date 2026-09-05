import { useEffect, useRef, useState, useCallback } from 'react';
import { Video, VideoOff, ShieldCheck, ShieldAlert, ShieldX, Loader2, Smartphone, Brain, Cloud } from 'lucide-react';
import { Button } from './ui/button';
import { useFaceDetection, type FaceViolation, type ProctorStatus } from '@/hooks/useFaceDetection';
// Removed useRekognition
import { useProctoringSettings } from '@/hooks/useProctoringSettings';

interface WebcamPanelProps {
  onStreamReady?: (stream: MediaStream) => void;
  /** Called only on the FATAL (2nd) strike — triggers abort in parent */
  onViolation?: (violation: FaceViolation) => void;
  /** Called on the 1st warning strike (non-fatal) — parent can log it */
  onWarning?: (violation: FaceViolation) => void;
  /** Enable AI face proctoring. Defaults to true. */
  proctoring?: boolean;
  /** Enable object detection for phones/books. Defaults to true. */
  objectDetection?: boolean;
}

const STRIKE_COOLDOWN_MS = 2000;

const STATUS_CONFIG: Record<ProctorStatus | RekognitionStatus, { color: string; bg: string; icon: typeof ShieldCheck }> = {
  idle:    { color: 'text-gray-300', bg: 'bg-gray-500/80', icon: ShieldCheck },
  loading: { color: 'text-blue-300', bg: 'bg-blue-500/80', icon: Loader2 },
  ok:      { color: 'text-green-300', bg: 'bg-green-600/80', icon: ShieldCheck },
  warning: { color: 'text-yellow-300', bg: 'bg-yellow-500/80', icon: ShieldAlert },
  violation: { color: 'text-red-300', bg: 'bg-red-600/90', icon: ShieldX },
  error:   { color: 'text-red-300', bg: 'bg-red-600/90', icon: ShieldX },
};

export default function WebcamPanel({ onStreamReady, onViolation, onWarning, proctoring = true, objectDetection = true }: WebcamPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  // ── Unified strike system ──
  const globalStrikes = useRef(0);
  const lastStrikeTime = useRef(0);
  const [strikeDisplay, setStrikeDisplay] = useState(0);

  // ── Admin proctoring settings ──
  const { settings } = useProctoringSettings();

  // ── Stable callback refs so the hook doesn't re-trigger ──
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;
  const onWarningRef = useRef(onWarning);
  onWarningRef.current = onWarning;

  // ── Determine which engines are active based on settings ──
  const tfShouldRun = true; // Hardcoded to true for TF fallback
  const tfEnabled = proctoring && isVideoEnabled && !error && tfShouldRun;
  const objEnabled = proctoring && settings.objectDetection && objectDetection && tfShouldRun;

  // ── Client-side face detection (TF.js — every ~1.5s) ─────
  const { 
    status: tfStatus, 
    faceCount: tfFaceCount, 
    violation: tfViolation, 
    statusMessage: tfStatusMessage, 
    detectedObjects: tfDetectedObjects 
  } = useFaceDetection(videoRef, {
    enabled: tfEnabled,
    intervalMs: settings.tfIntervalMs,
    noFaceStrikeSec: settings.noFaceStrikeSec,
    objectDetection: objEnabled,
  });

  // ── Compute combined status ──
  const status = tfEnabled ? tfStatus : 'ok' as ProctorStatus;
  const faceCount = tfEnabled ? tfFaceCount : 0;
  const statusMessage = tfEnabled ? tfStatusMessage : 'Proctoring disabled';
  
  // Only show prohibited objects (phones, tablets, books)
  const prohibitedItems = tfDetectedObjects || [];

  /**
   * Unified strike handler — TF.js feeds into this.
   * 5-second cooldown between strikes to prevent rapid double-counting.
   * 2 strikes = abort.
   */
  const handleGlobalStrike = useCallback((type: FaceViolation['type'], message: string) => {
    const now = Date.now();
    if (now - lastStrikeTime.current < STRIKE_COOLDOWN_MS) return;

    lastStrikeTime.current = now;
    globalStrikes.current += 1;
    const count = globalStrikes.current;
    setStrikeDisplay(count);

    const isFatal = count >= 2;
    const v: FaceViolation = {
      type,
      message: isFatal
        ? `⛔ Strike ${count}: ${message} — Interview aborted!`
        : `⚠️ Strike ${count}: ${message} — Next violation will abort!`,
      timestamp: now,
      isFatal,
    };

    if (isFatal) {
      onViolationRef.current?.(v);
    } else {
      onWarningRef.current?.(v);
    }
  }, []);

  // Forward TF.js violations to unified strike handler
  useEffect(() => {
    if (!tfViolation) return;
    // Hooks now report raw messages without strike prefixes
    handleGlobalStrike(tfViolation.type, tfViolation.message);
  }, [tfViolation, handleGlobalStrike]);

  // ── Webcam start / stop ──────────────────────────────────
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startWebcam = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        });

        currentStream = mediaStream;
        setStream(mediaStream);
        onStreamReady?.(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: unknown) {
        console.error('Error accessing webcam:', err);
        setError('Unable to access camera. Please check permissions.');
      }
    };

    startWebcam();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [onStreamReady]);

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  // Resolve status badge config
  const cfg = STATUS_CONFIG[status];
  const StatusIcon = cfg.icon;

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      {error ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <VideoOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />

          {/* ── Proctor Status Badge (top-left) ── */}
          {proctoring && (
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              <div
                className={`flex items-center gap-1.5 ${cfg.bg} px-2 py-1 rounded-full transition-colors duration-300`}
              >
                <StatusIcon
                  className={`w-3 h-3 ${cfg.color} ${status === 'loading' ? 'animate-spin' : ''}`}
                />
                <span className="text-white text-[10px] font-medium leading-none max-w-[130px] truncate">
                  {statusMessage}
                </span>
              </div>
            </div>
          )}

          {/* ── Strike Counter + Face Count (top-right) ── */}
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {/* Global strike counter */}
            {proctoring && (
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                  strikeDisplay >= 2
                    ? 'bg-red-600/90'
                    : strikeDisplay === 1
                    ? 'bg-yellow-500/80'
                    : 'bg-green-600/80'
                }`}
              >
                <span className="text-white text-[10px] font-bold">
                  {strikeDisplay}/2 strikes
                </span>
              </div>
            )}
            {/* Face count */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full ${
                status === 'violation'
                  ? 'bg-red-600/90'
                  : status === 'warning'
                  ? 'bg-yellow-500/80'
                  : 'bg-green-600/80'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  status === 'violation' ? 'bg-red-300' : 'bg-white'
                } ${status !== 'loading' ? 'animate-pulse' : ''}`}
              />
              <span className="text-white text-[10px] font-medium">
                {status === 'loading' ? 'INIT' : `${faceCount} face${faceCount !== 1 ? 's' : ''}`}
              </span>
            </div>
            {/* Detected prohibited objects (phones, tablets, books only) */}
            {prohibitedItems.length > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600/90">
                <Smartphone className="w-2.5 h-2.5 text-red-200" />
                <span className="text-white text-[10px] font-bold">
                  {[...new Set(prohibitedItems.map((o) => o.name))].join(', ')}
                </span>
              </div>
            )}
            {/* Strike counter */}
            {proctoring && strikeDisplay > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-600/90">
                <span className="text-white text-[10px] font-bold">
                  {strikeDisplay}/2 strikes
                </span>
              </div>
            )}
          </div>

          {/* ── Warning / Violation overlay ── */}
          {(status === 'warning' || status === 'violation') && (
            <div
              className={`absolute inset-0 flex items-center justify-center ${
                status === 'violation' ? 'bg-red-900/60' : 'bg-yellow-900/40'
              } transition-colors duration-300`}
            >
              <div className="text-center px-3">
                <ShieldAlert
                  className={`w-8 h-8 mx-auto mb-1 ${
                    status === 'violation' ? 'text-red-400' : 'text-yellow-400'
                  } animate-pulse`}
                />
                <p className="text-white text-xs font-semibold drop-shadow-md">
                  {statusMessage}
                </p>
              </div>
            </div>
          )}

          {/* ── Video Toggle Button ── */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleVideo}
              className="bg-black/50 border-white/20 hover:bg-black/70 h-7 px-2"
            >
              {isVideoEnabled ? (
                <Video className="w-3.5 h-3.5 text-white" />
              ) : (
                <VideoOff className="w-3.5 h-3.5 text-white" />
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
