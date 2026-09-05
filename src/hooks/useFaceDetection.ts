import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────
export type ProctorStatus = 'loading' | 'ok' | 'warning' | 'violation';


export interface FaceViolation {
  type: 'no_face' | 'multiple_faces' | 'prohibited_object' | 'right_click' | 'split_screen' | 'copy_attempt' | 'paste_attempt' | 'devtools_attempt' | 'tab_switch';
  message: string;
  timestamp: number;
  snapshot?: string;
  /** true = 2nd strike, abort the interview */
  isFatal: boolean;
}

/**
 * Objects COCO-SSD should flag, keyed by COCO class name.
 * Value = minimum confidence threshold.
 *
 * Lower thresholds for phone-like classes because:
 *  - The BACK of a phone is often detected at lower confidence (~0.25-0.40)
 *  - COCO-SSD frequently misclassifies a phone back as "remote" or even "mouse"
 * Higher threshold for "book" since it has clearer visual features.
 */
const PROHIBITED_OBJECT_THRESHOLDS: Record<string, number> = {
  'cell phone': 0.25,   // very low — catches back-camera side too
  'remote':     0.30,   // phones often classified as remotes
  'mouse':      0.35,   // phone-back sometimes classified as mouse
  'book':       0.45,
};

/** Friendly display names for detected classes */
const CLASS_DISPLAY_NAMES: Record<string, string> = {
  'cell phone': 'Cell phone',
  'remote':     'Phone / Remote',
  'mouse':      'Phone / Device',
  'book':       'Book',
};

export interface UseFaceDetectionOptions {
  /** How often (ms) to run detection. Lower = more responsive but heavier. Default 1000 */
  intervalMs?: number;
  /** Seconds of 0-face before a strike is counted. Default 5 */
  noFaceStrikeSec?: number;
  /** Whether detection is active */
  enabled?: boolean;
  /** Enable object detection (phone/book). Default true */
  objectDetection?: boolean;
}

export interface DetectedObject {
  class: string;
  score: number;
}

export interface UseFaceDetectionReturn {
  status: ProctorStatus;
  faceCount: number;
  /** The latest violation. null until something fires. No internal strike counting — WebcamPanel handles that. */
  violation: FaceViolation | null;
  violations: FaceViolation[];
  statusMessage: string;
  /** Prohibited objects currently visible in frame */
  detectedObjects: DetectedObject[];
}

// ─── Lazy model loading ───────────────────────────────────────
let tfReady: Promise<void> | null = null;
let blazefaceModel: any = null;
let cocoSsdModel: any = null;

async function ensureTfReady() {
  if (tfReady) { await tfReady; return; }
  const tf = await import('@tensorflow/tfjs');
  tfReady = tf.setBackend('webgl').then(() => tf.ready()).catch(async () => {
    console.warn('[Proctor] WebGL unavailable, falling back to CPU backend');
    await tf.setBackend('cpu');
    await tf.ready();
  });
  await tfReady;
}

async function ensureBlazeFaceLoaded() {
  if (blazefaceModel) return blazefaceModel;
  await ensureTfReady();
  const blazeface = await import('@tensorflow-models/blazeface');
  blazefaceModel = await blazeface.load();
  return blazefaceModel;
}

async function ensureCocoSsdLoaded() {
  if (cocoSsdModel) return cocoSsdModel;
  await ensureTfReady();
  const cocoSsd = await import('@tensorflow-models/coco-ssd');
  cocoSsdModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' }); // lightest model
  return cocoSsdModel;
}

// ─── Hook ─────────────────────────────────────────────────────
export function useFaceDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  options: UseFaceDetectionOptions = {}
): UseFaceDetectionReturn {
  const {
    intervalMs = 1000,  // 1 second for faster detection
    noFaceStrikeSec = 5,
    enabled = true,
    objectDetection = true,
  } = options;

  const [status, setStatus] = useState<ProctorStatus>('loading');
  const [faceCount, setFaceCount] = useState(0);
  const [violation, setViolation] = useState<FaceViolation | null>(null);
  const [violations, setViolations] = useState<FaceViolation[]>([]);
  const [statusMessage, setStatusMessage] = useState('Initializing proctoring...');
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);

  // Mutable counters that persist across renders without triggering re-renders
  const noFaceStart = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cycleCount = useRef(0);
  /**
   * Multi-frame confirmation: require prohibited objects to be detected in
   * 2 consecutive cycles before triggering a strike. This avoids false
   * positives from the lower confidence thresholds.
   */
  const consecutiveObjectHits = useRef(0);
  const CONSECUTIVE_HITS_NEEDED = 2;

  // Capture a snapshot from the video element
  const captureSnapshot = useCallback((): string | undefined => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return undefined;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      ctx.drawImage(video, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.5);
    } catch {
      return undefined;
    }
  }, [videoRef]);

  const pushViolation = useCallback(
    (v: FaceViolation) => {
      setViolation(v);
      setViolations((prev) => [...prev, v]);
    },
    []
  );

  /**
   * Report a violation — no internal strike counting.
   * WebcamPanel's global handler is the single source of truth for strikes.
   */
  const reportViolation = useCallback(
    (type: 'no_face' | 'multiple_faces' | 'prohibited_object', detailMsg: string) => {
      const v: FaceViolation = {
        type,
        message: detailMsg,
        timestamp: Date.now(),
        snapshot: captureSnapshot(),
        isFatal: false, // WebcamPanel decides fatality
      };

      pushViolation(v);
      noFaceStart.current = null;
      setStatus('warning');
      setStatusMessage(detailMsg);
    },
    [captureSnapshot, pushViolation]
  );

  useEffect(() => {
    if (!enabled) {
      setStatus('ok');
      setStatusMessage('Proctoring disabled');
      return;
    }

    let cancelled = false;

    // ── Bootstrap models ─────────────────────────────────────
    (async () => {
      try {
        // Load BlazeFace first (essential)
        await ensureBlazeFaceLoaded();
        if (cancelled) return;
        setStatus('ok');
        setStatusMessage('Face detection active');

        // Load COCO-SSD in background (non-blocking)
        if (objectDetection) {
          ensureCocoSsdLoaded()
            .then(() => { if (!cancelled) console.log('[Proctor] COCO-SSD ready'); })
            .catch((err) => console.warn('[Proctor] COCO-SSD load failed (non-critical):', err));
        }
      } catch (err) {
        console.error('[Proctor] BlazeFace load failed:', err);
        if (!cancelled) {
          setStatus('ok');
          setStatusMessage('Face detection unavailable');
        }
        return;
      }

      // ── Detection loop ───────────────────────────────────
      const detect = async () => {
        if (cancelled) return;

        const video = videoRef.current;
        if (!video || video.readyState < 2 || video.videoWidth === 0) return;

        cycleCount.current += 1;

        try {
          // ── Run face detection and object detection in parallel ──────
          // Running both simultaneously prevents the race where a phone screen
          // is detected as a face before COCO-SSD has a chance to identify it
          // as a prohibited object, which would incorrectly fire 'multiple_faces'.
          const faceModel = await ensureBlazeFaceLoaded();
          const objModel = objectDetection && cocoSsdModel ? cocoSsdModel : null;

          const [facePreds, rawObjPreds] = await Promise.all([
            faceModel.estimateFaces(video, false),
            objModel ? (objModel.detect(video) as Promise<any[]>) : Promise.resolve([] as any[]),
          ]);
          if (cancelled) return;

          const count = facePreds.length;
          setFaceCount(count);

          // ── 1) Object detection — checked BEFORE multiple-faces ──────
          // This ensures that a phone's bright screen or face-like pattern
          // does not trigger a false 'multiple_faces' violation instead of
          // the correct 'prohibited_object' one.
          let prohibitedPending = false;
          if (objectDetection && cocoSsdModel) {
            const prohibited: DetectedObject[] = rawObjPreds
              .filter((p: any) => {
                const threshold = PROHIBITED_OBJECT_THRESHOLDS[p.class];
                return threshold !== undefined && p.score >= threshold;
              })
              .map((p: any) => ({
                class: CLASS_DISPLAY_NAMES[p.class] || p.class,
                score: p.score,
              }));

            setDetectedObjects(prohibited);

            if (prohibited.length > 0) {
              prohibitedPending = true;
              consecutiveObjectHits.current += 1;

              if (consecutiveObjectHits.current >= CONSECUTIVE_HITS_NEEDED) {
                consecutiveObjectHits.current = 0;
                const names = [...new Set(prohibited.map((p) => p.class))].join(', ');
                reportViolation('prohibited_object', `Prohibited object detected: ${names}`);
                return;
              }

              // Accumulating hits: show a pending warning in the webcam overlay
              const names = [...new Set(prohibited.map((p) => p.class))].join(', ');
              setStatus('warning');
              setStatusMessage(`⚠️ ${names} in frame — remove immediately`);
            } else {
              consecutiveObjectHits.current = 0;
            }
          }

          // ── 2) Multiple-face check ───────────────────────────────────
          // Suppressed when a prohibited object is pending — the phone's
          // bright screen or pattern may be what BlazeFace is counting as a
          // second face. The object violation will fire on the next cycle.
          if (count >= 2 && !prohibitedPending) {
            reportViolation('multiple_faces', `${count} faces detected — another person in frame`);
            return;
          }

          // ── 3) No-face check ─────────────────────────────────────────
          if (count === 0) {
            if (noFaceStart.current === null) noFaceStart.current = Date.now();
            const elapsed = (Date.now() - noFaceStart.current) / 1000;
            if (elapsed >= noFaceStrikeSec) {
              reportViolation('no_face', 'No face detected for too long');
              noFaceStart.current = Date.now(); // Reset so it doesn't re-fire every cycle
              return;
            }
            setStatus('ok');
            setStatusMessage(`Face not detected (${Math.round(elapsed)}s) — stay in frame`);
          } else {
            noFaceStart.current = null;
          }

          // ── 4) All clear ─────────────────────────────────────────────
          if (count >= 1 && !prohibitedPending) {
            setStatus('ok');
            setStatusMessage('Proctoring active ✓');
          }
        } catch (err) {
          console.warn('[Proctor] detection cycle error:', err);
        }
      };

      detect();
      intervalRef.current = setInterval(detect, intervalMs);
    })();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, noFaceStrikeSec, objectDetection]);

  return { status, faceCount, violation, violations, statusMessage, detectedObjects };
}
