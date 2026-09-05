/**
 * VidyaMitra AWS Rekognition Routes
 * Handles face detection and analysis for proctoring via AWS Rekognition.
 * 
 * Proctoring rules (same as TensorFlow):
 * - no_face: No face detected in frame
 * - multiple_faces: More than one face detected
 * - face_not_centered: Face is not properly centered/visible
 * - prohibited_object: Phone, book, or other prohibited items detected
 * - face_covered: Sunglasses, face covering detected
 * - looking_away: Face oriented away from screen (yaw/pitch analysis)
 */

import type { ViteDevServer } from 'vite';
import type { ServerResponse, IncomingMessage } from 'http';
import {
  RekognitionClient,
  DetectFacesCommand,
  DetectLabelsCommand,
  DetectFacesCommandOutput,
  DetectLabelsCommandOutput,
  FaceDetail,
  Attribute,
} from '@aws-sdk/client-rekognition';
import { trackRekognitionAnalysis } from './awsUsageCounter';

const REGION = 'us-east-1';

// Thresholds for proctoring violations
const PROCTORING_THRESHOLDS = {
  // Confidence thresholds
  minFaceConfidence: 85,
  minLabelConfidence: 60, // Lower threshold for better phone detection

  // Prohibited objects - ONLY these matter for proctoring
  // Must be strict phone/device detection labels
  prohibitedLabels: [
    'Cell Phone', 'Mobile Phone', 'Phone', 'Cellphone',
    'Tablet', 'Tablet Computer',
    'Book', 'Notebook',
  ] as const,
  
  // Labels to explicitly IGNORE (clothing, background, etc.)
  ignoredLabels: [
    'Person', 'Human', 'Face', 'Head', 'Portrait',
    'Clothing', 'T-Shirt', 'Shirt', 'Pants', 'Dress', 'Apparel',
    'Furniture', 'Chair', 'Table', 'Desk', 'Wall', 'Room',
    'Indoors', 'Interior Design', 'Home Decor',
    'Lamp', 'Light', 'Lighting',
    'Glasses', 'Spectacles', // Handle via face analysis, not labels
    'Beard', 'Hair', 'Skin',
    'Monitor', 'Screen', 'Display', 'Computer', 'Laptop', 'Electronics', // User's own screen is fine
  ] as const,
};

let rekognitionClient: RekognitionClient | null = null;

export function initRekognition(env: Record<string, string>) {
  const credentials = {
    accessKeyId: env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '',
    sessionToken: env.AWS_SESSION_TOKEN || process.env.AWS_SESSION_TOKEN || undefined,
  };

  if (!credentials.accessKeyId || !credentials.secretAccessKey) {
    console.warn('  ⚠️  AWS credentials not found — Rekognition routes will not work');
    return;
  }

  rekognitionClient = new RekognitionClient({
    region: env.AWS_REGION || REGION,
    credentials,
  });

  console.log('  ✅ AWS Rekognition initialized');
}

export interface RekognitionViolation {
  type: 'no_face' | 'multiple_faces' | 'prohibited_object' | 'face_covered' | 'looking_away' | 'face_not_centered';
  message: string;
  confidence: number;
  details?: Record<string, any>;
}

export interface RekognitionAnalysis {
  faceCount: number;
  violations: RekognitionViolation[];
  // Only prohibited objects (phones, books) - not all labels
  prohibitedObjects?: Array<{ name: string; confidence: number }>;
  timestamp: number;
  // Metadata for admin reports - NOT used for violations
  metadata?: {
    faceDetails?: {
      boundingBox?: { width: number; height: number; left: number; top: number };
      pose?: { yaw: number; pitch: number; roll: number };
      quality?: { brightness: number; sharpness: number };
      confidence: number;
    };
    // Emotions/mood for admin report
    primaryEmotion?: string;
    emotionConfidence?: number;
    allEmotions?: Array<{ type: string; confidence: number }>;
    // Engagement indicators
    eyesOpen?: boolean;
    smile?: boolean;
    attentionScore?: number; // 0-100 based on face position/orientation
  };
}

async function analyzeFaces(imageBytes: Buffer): Promise<DetectFacesCommandOutput | null> {
  if (!rekognitionClient) return null;

  try {
    const command = new DetectFacesCommand({
      Image: { Bytes: imageBytes },
      Attributes: ['ALL'] as Attribute[],
    });
    return await rekognitionClient.send(command);
  } catch (error: any) {
    console.error('[Rekognition] Face detection error:', error.message);
    return null;
  }
}

async function analyzeLabels(imageBytes: Buffer): Promise<DetectLabelsCommandOutput | null> {
  if (!rekognitionClient) return null;

  try {
    const command = new DetectLabelsCommand({
      Image: { Bytes: imageBytes },
      MaxLabels: 20,
      MinConfidence: 50,
    });
    return await rekognitionClient.send(command);
  } catch (error: any) {
    console.error('[Rekognition] Label detection error:', error.message);
    return null;
  }
}

function processFaceResults(facesResult: DetectFacesCommandOutput | null): {
  faceCount: number;
  violations: RekognitionViolation[];
  metadata?: RekognitionAnalysis['metadata'];
} {
  const violations: RekognitionViolation[] = [];
  let metadata: RekognitionAnalysis['metadata'] | undefined;

  if (!facesResult || !facesResult.FaceDetails) {
    // No face - this is a CRITICAL violation
    violations.push({
      type: 'no_face',
      message: 'No face detected in frame',
      confidence: 100,
    });
    return { faceCount: 0, violations };
  }

  const faces = facesResult.FaceDetails;
  const faceCount = faces.length;

  // No face violation
  if (faceCount === 0) {
    violations.push({
      type: 'no_face',
      message: 'No face detected in frame',
      confidence: 100,
    });
    return { faceCount: 0, violations };
  }

  // Multiple faces violation (CRITICAL - includes partial faces)
  // Rekognition detects even partial faces with lower confidence
  if (faceCount > 1) {
    violations.push({
      type: 'multiple_faces',
      message: `${faceCount} faces detected — another person in frame`,
      confidence: 95,
      details: { faceCount },
    });
  }

  // Process primary face for METADATA (not violations)
  const primaryFace = faces[0];
  
  if (primaryFace) {
    const pose = primaryFace.Pose;
    const quality = primaryFace.Quality;
    const box = primaryFace.BoundingBox;
    
    // Calculate attention score based on face position (0-100)
    let attentionScore = 100;
    if (pose) {
      const absYaw = Math.abs(pose.Yaw || 0);
      const absPitch = Math.abs(pose.Pitch || 0);
      // Reduce attention score based on how much user looks away
      attentionScore = Math.max(0, 100 - (absYaw * 1.5) - (absPitch * 2));
    }

    // Get primary emotion for report
    const emotions = primaryFace.Emotions || [];
    const topEmotion = emotions.reduce(
      (max, e) => (e.Confidence || 0) > (max.Confidence || 0) ? e : max,
      emotions[0] || { Type: 'NEUTRAL', Confidence: 0 }
    );

    metadata = {
      faceDetails: {
        boundingBox: box ? {
          width: box.Width || 0,
          height: box.Height || 0,
          left: box.Left || 0,
          top: box.Top || 0,
        } : undefined,
        pose: pose ? {
          yaw: pose.Yaw || 0,
          pitch: pose.Pitch || 0,
          roll: pose.Roll || 0,
        } : undefined,
        quality: quality ? {
          brightness: quality.Brightness || 0,
          sharpness: quality.Sharpness || 0,
        } : undefined,
        confidence: primaryFace.Confidence || 0,
      },
      primaryEmotion: topEmotion.Type || 'NEUTRAL',
      emotionConfidence: topEmotion.Confidence || 0,
      allEmotions: emotions.map(e => ({
        type: e.Type || 'UNKNOWN',
        confidence: e.Confidence || 0,
      })),
      eyesOpen: primaryFace.EyesOpen?.Value ?? true,
      smile: primaryFace.Smile?.Value ?? false,
      attentionScore: Math.round(attentionScore),
    };

    // NOTE: We do NOT create violations for sunglasses, looking away, etc.
    // These are only captured as metadata for admin reports.
    // Only CRITICAL violations (no_face, multiple_faces, prohibited_object) count as strikes.
  }

  return { faceCount, violations, metadata };
}

function processLabelResults(labelsResult: DetectLabelsCommandOutput | null): {
  violations: RekognitionViolation[];
  prohibitedObjects: Array<{ name: string; confidence: number }>;
} {
  const violations: RekognitionViolation[] = [];
  const prohibitedObjects: Array<{ name: string; confidence: number }> = [];

  if (!labelsResult || !labelsResult.Labels) {
    return { violations, prohibitedObjects };
  }

  for (const label of labelsResult.Labels) {
    const name = label.Name || '';
    const confidence = label.Confidence || 0;
    const nameLower = name.toLowerCase();

    // SKIP ignored labels (clothing, furniture, background, etc.)
    const isIgnored = PROCTORING_THRESHOLDS.ignoredLabels.some(
      ignored => nameLower.includes(ignored.toLowerCase())
    );
    if (isIgnored) continue;

    // Check for PROHIBITED objects only (phones, tablets, books)
    const isProhibited = PROCTORING_THRESHOLDS.prohibitedLabels.some(
      prohibited => nameLower.includes(prohibited.toLowerCase())
    );

    if (isProhibited && confidence > PROCTORING_THRESHOLDS.minLabelConfidence) {
      // Determine if it's a phone (most critical)
      const isPhone = ['cell phone', 'mobile phone', 'phone', 'cellphone'].some(
        p => nameLower.includes(p)
      );
      
      // Track prohibited object
      prohibitedObjects.push({ name, confidence });

      // Create violation - this is a CRITICAL strike
      violations.push({
        type: 'prohibited_object',
        message: isPhone 
          ? `Cell phone detected in frame — prohibited during exam`
          : `Prohibited item detected: ${name}`,
        confidence,
        details: { objectName: name, isPhone },
      });
    }
  }

  return { violations, prohibitedObjects };
}

export function registerRekognitionRoutes(
  server: ViteDevServer,
  env: Record<string, string>,
  getSessionAsync: (req: IncomingMessage) => Promise<{ userId: string; email: string; isAdmin: boolean; name: string } | null>,
  sendJson: (res: ServerResponse, status: number, data: any) => void,
  parseBody: (req: IncomingMessage) => Promise<any>,
) {
  if (!rekognitionClient) {
    console.warn('  ⚠️  Rekognition client not initialized — skipping Rekognition route registration');
    return;
  }

  // POST /api/rekognition/analyze — analyze frame for proctoring
  server.middlewares.use('/api/rekognition/analyze', async (req: any, res: any, next: any) => {
    if (req.method !== 'POST') return next();

    try {
      const session = await getSessionAsync(req);
      if (!session) {
        return sendJson(res, 401, { error: 'Authentication required' });
      }

      const body = await parseBody(req);
      const { imageBase64, detectObjects = true } = body;

      if (!imageBase64) {
        return sendJson(res, 400, { error: 'imageBase64 is required' });
      }

      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const imageBytes = Buffer.from(base64Data, 'base64');

      // Validate image size (max 5MB for Rekognition)
      if (imageBytes.length > 5 * 1024 * 1024) {
        return sendJson(res, 400, { error: 'Image too large (max 5MB)' });
      }

      // Run face detection and optionally label detection in parallel
      const [facesResult, labelsResult] = await Promise.all([
        analyzeFaces(imageBytes),
        detectObjects ? analyzeLabels(imageBytes) : Promise.resolve(null),
      ]);

      // Track AWS usage
      const analysisCount = 1 + (detectObjects ? 1 : 0);
      try {
        await trackRekognitionAnalysis(analysisCount);
      } catch {
        // Non-critical
      }

      // Process results
      const faceAnalysis = processFaceResults(facesResult);
      const labelAnalysis = processLabelResults(labelsResult);

      // Merge violations (dedupe by type for same frame)
      const allViolations: RekognitionViolation[] = [...faceAnalysis.violations];
      for (const v of labelAnalysis.violations) {
        // Don't add duplicate violation types
        if (!allViolations.some(existing => existing.type === v.type)) {
          allViolations.push(v);
        }
      }

      const analysis: RekognitionAnalysis = {
        faceCount: faceAnalysis.faceCount,
        violations: allViolations,
        // Only include prohibited objects (phones, books, tablets) - not all labels
        prohibitedObjects: labelAnalysis.prohibitedObjects.length > 0 
          ? labelAnalysis.prohibitedObjects 
          : undefined,
        timestamp: Date.now(),
        // Metadata is for admin reports, not displayed during exam
        metadata: faceAnalysis.metadata,
      };

      return sendJson(res, 200, analysis);
    } catch (error: any) {
      console.error('[Rekognition] Analysis error:', error);
      return sendJson(res, 500, { error: error.message || 'Rekognition analysis failed' });
    }
  });

  // GET /api/rekognition/status — check if Rekognition is configured
  server.middlewares.use('/api/rekognition/status', async (req: any, res: any, next: any) => {
    if (req.method !== 'GET') return next();

    return sendJson(res, 200, {
      configured: rekognitionClient !== null,
      region: env.AWS_REGION || REGION,
    });
  });

  console.log('  ✅ Rekognition routes registered');
}
