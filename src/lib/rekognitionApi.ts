// ─── Rekognition API Client ───────────────────────────────────

export interface FaceAnalysis {
  faceIndex: number;
  dominantEmotion: string;
  emotionConfidence: number;
  emotions: Array<{ type: string; confidence: number }>;
  pose: { yaw: number; pitch: number; roll: number };
  eyeDirection: { yaw: number; pitch: number } | null;
  eyesOpen: boolean;
  mouthOpen: boolean;
  sunglasses: boolean;
  faceOccluded: boolean;
  ageRange: { low: number; high: number } | null;
  quality: { brightness: number; sharpness: number } | null;
}

export interface RekognitionViolation {
  type: 'no_face' | 'multiple_faces' | 'sunglasses' | 'head_turned' | 'eyes_away' | 'face_occluded';
  severity: 'warning' | 'violation';
  message: string;
}

export interface RekognitionAnalysisResult {
  faceCount: number;
  faces: FaceAnalysis[];
  violations: RekognitionViolation[];
  analyzedAt: string;
}

export interface ProctoringSettings {
  tensorflow: boolean;
  rekognition: boolean;
  objectDetection: boolean;
  tfIntervalMs: number;
  rekIntervalMs: number;
  headYawThreshold: number;
  eyeYawThreshold: number;
  noFaceStrikeSec: number;
  rekognitionConfigured?: boolean;
}

export const rekognitionApi = {
  /** Check if Rekognition is configured on the server */
  async getStatus(): Promise<{ configured: boolean }> {
    const res = await fetch('/api/rekognition/status');
    if (!res.ok) throw new Error('Failed to get Rekognition status');
    return res.json();
  },

  /** Send a webcam frame (base64 JPEG) for analysis */
  async analyzeFrame(imageBase64: string): Promise<RekognitionAnalysisResult> {
    const res = await fetch('/api/rekognition/analyze-frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Rekognition analysis failed');
    }
    return res.json();
  },

  /** Get proctoring settings (admin + interview) */
  async getProctoringSettings(): Promise<ProctoringSettings> {
    const res = await fetch('/api/settings/proctoring');
    if (!res.ok) throw new Error('Failed to get proctoring settings');
    return res.json();
  },

  /** Save proctoring settings (admin only) */
  async saveProctoringSettings(settings: Partial<ProctoringSettings>): Promise<{ success: boolean; settings: ProctoringSettings }> {
    const token = localStorage.getItem('vidyamitra_token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch('/api/settings/proctoring', {
      method: 'POST',
      headers,
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to save proctoring settings');
    }
    return res.json();
  },
};
