import { useEffect, useState, useCallback } from 'react';

export type ProctoringMode = 'tensorflow';

export interface ProctoringSettings {
  // Engine mode
  proctoringMode: ProctoringMode;
  // TensorFlow settings
  tensorflow: boolean;
  objectDetection: boolean;
  tfIntervalMs: number;
  noFaceStrikeSec: number;
}

const DEFAULT_SETTINGS: ProctoringSettings = {
  proctoringMode: 'tensorflow',
  tensorflow: true,
  objectDetection: true,
  tfIntervalMs: 1000,  // 1 second - faster detection
  noFaceStrikeSec: 5,  // 5 seconds before strike (reduced from 7)
};

/**
 * Fetches proctoring settings from the server once on mount.
 * Falls back to sensible defaults if the fetch fails.
 */
export function useProctoringSettings() {
  const [settings, setSettings] = useState<ProctoringSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/proctoring');
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
        setError(null);
      } else {
        throw new Error('Failed to fetch settings');
      }
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = useCallback(async (newSettings: Partial<ProctoringSettings>) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/proctoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vidyamitra_token') || ''}`,
        },
        body: JSON.stringify(newSettings),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed to save settings');
      }
      
      const result = await res.json();
      if (result.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...result.settings });
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateSettings = useCallback((updates: Partial<ProctoringSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  return { 
    settings, 
    loading, 
    saving,
    error,
    saveSettings,
    updateSettings,
    refetch: fetchSettings,
  };
}
