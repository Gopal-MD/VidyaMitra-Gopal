import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────
export type RekognitionStatus = 'idle' | 'loading' | 'ok' | 'warning' | 'violation' | 'error';

export interface RekognitionViolation {
  type: 'no_face' | 'multiple_faces' | 'prohibited_object';  // Only critical violations
  message: string;
  confidence: number;
  timestamp: number;
  details?: Record<string, any>;
  /** true = 2nd strike, abort the interview */
  isFatal?: boolean;
}

// Metadata stored for admin reports (emotions, pose, attention)
export interface RekognitionMetadata {
  faceDetails?: {
    boundingBox?: { width: number; height: number; left: number; top: number };
    pose?: { yaw: number; pitch: number; roll: number };
    quality?: { brightness: number; sharpness: number };
    confidence: number;
  };
  primaryEmotion?: string;
  emotionConfidence?: number;
  allEmotions?: Array<{ type: string; confidence: number }>;
  eyesOpen?: boolean;
  smile?: boolean;
  attentionScore?: number;  // 0-100
}

export interface ProhibitedObject {
  name: string;
  confidence: number;
}

export interface UseRekognitionOptions {
  /** How often (ms) to run detection. Default 2000 (2s) - higher to reduce API costs */
  intervalMs?: number;
  /** Seconds of 0-face before a strike is counted. Default 5 */
  noFaceStrikeSec?: number;
  /** Whether detection is active */
  enabled?: boolean;
  /** Enable object detection (phone/book). Default true */
  objectDetection?: boolean;
}

export interface UseRekognitionReturn {
  status: RekognitionStatus;
  faceCount: number;
  /** The latest violation. null until something fires. No internal strike counting — WebcamPanel handles that. */
  violation: RekognitionViolation | null;
  violations: RekognitionViolation[];
  statusMessage: string;
  /** Prohibited objects detected (phones, tablets, books only) */
  prohibitedObjects: ProhibitedObject[];
  /** Metadata for admin reports (emotions, attention, pose) - NOT displayed to user */
  metadata: RekognitionMetadata | null;
  /** All metadata samples collected during session for admin report */
  metadataHistory: RekognitionMetadata[];
  /** Whether the Rekognition API is available */
  isConfigured: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────
export function useRekognition(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UseRekognitionOptions = {}
): UseRekognitionReturn {
  const {
    intervalMs = 2000,  // 2 seconds for faster detection
    noFaceStrikeSec = 5,  // 5 seconds before strike
    enabled = true,
    objectDetection = true,
  } = options;

  const [status, setStatus] = useState<RekognitionStatus>('idle');
  const [faceCount, setFaceCount] = useState(0);
  const [violation, setViolation] = useState<RekognitionViolation | null>(null);
  const [violations, setViolations] = useState<RekognitionViolation[]>([]);
  const [statusMessage, setStatusMessage] = useState('Rekognition standby');
  const [prohibitedObjects, setProhibitedObjects] = useState<ProhibitedObject[]>([]);
  const [metadata, setMetadata] = useState<RekognitionMetadata | null>(null);
  const [metadataHistory, setMetadataHistory] = useState<RekognitionMetadata[]>([]);
  const [isConfigured, setIsConfigured] = useState(false);

  // Mutable counters
  const noFaceStart = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Report a violation — no internal strike counting.
   * WebcamPanel's global handler is the single source of truth for strikes.
   */
  const reportViolation = useCallback((type: RekognitionViolation['type'], message: string, confidence: number = 90, details?: Record<string, any>) => {
    const v: RekognitionViolation = {
      type,
      message,
      confidence,
      timestamp: Date.now(),
      details,
      isFatal: false, // WebcamPanel decides fatality via global counter
    };
    setViolation(v);
    setViolations((prev) => [...prev, v]);
    noFaceStart.current = null;
    setStatus('warning');
    setStatusMessage(message);
  }, []);

  /**
   * Capture a frame from the video element and convert to base64
   */
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null;

    try {
      const canvas = document.createElement('canvas');
      // Use smaller resolution to reduce API payload size and cost
      const scale = Math.min(1, 640 / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch {
      return null;
    }
  }, [videoRef]);

  // Check if Rekognition is configured on mount
  useEffect(() => {
    let cancelled = false;
    
    fetch('/api/rekognition/status')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!cancelled) {
          setIsConfigured(data.configured === true);
          if (!data.configured) {
            setStatus('error');
            setStatusMessage('Rekognition not configured');
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsConfigured(false);
          setStatus('error');
          setStatusMessage('Rekognition unavailable');
        }
      });

    return () => { cancelled = true; };
  }, []);

  // Main detection loop
  useEffect(() => {
    if (!enabled || !isConfigured) {
      if (!enabled) {
        setStatus('idle');
        setStatusMessage('Rekognition disabled');
      }
      return;
    }

    let cancelled = false;
    setStatus('loading');
    setStatusMessage('Initializing Rekognition...');

    const analyze = async () => {
      if (cancelled) return;

      const imageBase64 = captureFrame();
      if (!imageBase64) {
        setStatusMessage('Waiting for camera...');
        return;
      }

      try {
        const response = await fetch('/api/rekognition/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('vidyamitra_token') || ''}`,
          },
          body: JSON.stringify({
            imageBase64,
            detectObjects: objectDetection,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const analysis = await response.json();
        if (cancelled) return;

        // Update state from analysis
        setFaceCount(analysis.faceCount || 0);
        
        // Update prohibited objects (only phones, books, tablets)
        setProhibitedObjects(analysis.prohibitedObjects || []);
        
        // Store metadata for admin reports (emotions, attention, pose)
        if (analysis.metadata) {
          setMetadata(analysis.metadata);
          // Append to history for end-of-interview report
          setMetadataHistory((prev) => [...prev, { ...analysis.metadata, timestamp: Date.now() }]);
        }

        // Process violations - only critical ones (no_face, multiple_faces, prohibited_object)
        const apiViolations: Array<{ type: string; message: string; confidence: number; details?: any }> = analysis.violations || [];
        
        // No face handling with configurable timeout
        if (analysis.faceCount === 0) {
          if (noFaceStart.current === null) noFaceStart.current = Date.now();
          const elapsed = (Date.now() - noFaceStart.current) / 1000;
          
          if (elapsed >= noFaceStrikeSec) {
            reportViolation('no_face', `No face detected for ${noFaceStrikeSec}+ seconds`, 100);
            noFaceStart.current = Date.now(); // Reset timer after reporting
            return;
          }
          
          setStatus('warning');
          setStatusMessage(`Face not visible (${Math.round(noFaceStrikeSec - elapsed)}s until strike)`);
          return;
        } else {
          noFaceStart.current = null;
        }

        // Handle critical violations from API
        for (const v of apiViolations) {
          if (v.type === 'multiple_faces' || v.type === 'prohibited_object') {
            reportViolation(v.type as RekognitionViolation['type'], v.message, v.confidence, v.details);
            return;
          }
        }

        // All clear
        if (analysis.faceCount === 1 && apiViolations.length === 0) {
          setStatus('ok');
          setStatusMessage('Proctoring active ✓');
        }

      } catch (error: any) {
        console.warn('[Rekognition] Analysis error:', error.message);
        if (!cancelled) {
          setStatus('warning');
          setStatusMessage('Rekognition temporarily unavailable');
        }
      }
    };

    // Initial analysis
    setTimeout(() => {
      if (!cancelled) {
        setStatus('ok');
        setStatusMessage('Rekognition active');
        analyze();
      }
    }, 1000);

    // Set up interval
    intervalRef.current = setInterval(analyze, intervalMs);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    enabled,
    isConfigured,
    intervalMs,
    noFaceStrikeSec,
    objectDetection,
    captureFrame,
    reportViolation,
  ]);

  return {
    status,
    faceCount,
    violation,
    violations,
    statusMessage,
    prohibitedObjects,
    metadata,
    metadataHistory,
    isConfigured,
  };
}
