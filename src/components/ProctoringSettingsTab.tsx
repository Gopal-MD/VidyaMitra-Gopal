/**
 * ProctoringSettingsTab - Admin Panel Component
 * 
 * Allows admins to configure proctoring settings:
 * - Configure TensorFlow detection settings
 */

import React, { useState, useEffect } from 'react';
import { useProctoringSettings } from '@/hooks/useProctoringSettings';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  ShieldCheck,
  ShieldAlert,
  Eye,
  EyeOff,
  Smartphone,
  RefreshCw,
  Save,
  Loader2,
  Brain,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export default function ProctoringSettingsTab() {
  const { 
    settings, 
    loading, 
    saving, 
    error, 
    saveSettings, 
    updateSettings, 
    refetch 
  } = useProctoringSettings();
  
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState(settings);

  // Track changes
  useEffect(() => {
    if (!loading) {
      setOriginalSettings(settings);
    }
  }, [loading, settings]);

  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const handleSave = async () => {
    const success = await saveSettings(settings);
    if (success) {
      toast.success('Proctoring settings saved successfully');
      setOriginalSettings(settings);
      setHasChanges(false);
    } else {
      toast.error(error || 'Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Proctoring Settings
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure AI-powered exam proctoring and cheating detection
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refetch}
            disabled={loading || saving}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={`border-l-4 ${settings.tensorflow ? 'border-l-green-500' : 'border-l-gray-300'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-indigo-600" />
                <span className="font-medium">TensorFlow.js Engine</span>
              </div>
              <Badge variant={settings.tensorflow ? 'default' : 'secondary'}>
                {settings.tensorflow ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Client-side, free, ~1s detection
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Protection Level</span>
              </div>
              <Badge className="bg-indigo-600">
                Standard
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Client-side detection using TensorFlow.js. Fast, free, runs in browser.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TensorFlow Settings */}
      <Card className={!settings.tensorflow ? 'opacity-60' : ''}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-indigo-600" />
            TensorFlow.js Settings
            {!settings.tensorflow && <Badge variant="secondary" className="ml-2">Disabled</Badge>}
          </CardTitle>
          <CardDescription>
            Configure client-side face and object detection using TensorFlow.js
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Detection Interval */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Detection Interval
                </Label>
                <span className="text-sm font-medium">{settings.tfIntervalMs}ms</span>
              </div>
              <Slider
                value={[settings.tfIntervalMs]}
                onValueChange={([v]) => updateSettings({ tfIntervalMs: v })}
                min={1000}
                max={5000}
                step={250}
                disabled={!settings.tensorflow}
              />
              <p className="text-xs text-muted-foreground">
                How often to run face detection. Lower = more responsive but uses more CPU.
              </p>
            </div>

            {/* No Face Strike Timeout */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <EyeOff className="h-4 w-4" />
                  No Face Strike Timeout
                </Label>
                <span className="text-sm font-medium">{settings.noFaceStrikeSec}s</span>
              </div>
              <Slider
                value={[settings.noFaceStrikeSec]}
                onValueChange={([v]) => updateSettings({ noFaceStrikeSec: v })}
                min={3}
                max={15}
                step={1}
                disabled={!settings.tensorflow}
              />
              <p className="text-xs text-muted-foreground">
                Seconds without a face before counting as a strike.
              </p>
            </div>
          </div>

          {/* Object Detection Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-orange-500" />
              <div>
                <Label className="text-sm font-medium">Object Detection</Label>
                <p className="text-xs text-muted-foreground">
                  Detect phones, books, and other prohibited items using COCO-SSD
                </p>
              </div>
            </div>
            <Switch
              checked={settings.objectDetection}
              onCheckedChange={(v) => updateSettings({ objectDetection: v })}
              disabled={!settings.tensorflow}
            />
          </div>

          {/* Critical Violations Info */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-3 mt-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
              <span className="font-medium text-sm">Monitored Violations (2-Strike System)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2 p-2 bg-background rounded border">
                <EyeOff className="h-4 w-4 text-red-500" />
                <div>
                  <p className="font-medium">No Face Detected</p>
                  <p className="text-muted-foreground">{settings.noFaceStrikeSec}s timeout before strike</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-background rounded border">
                <Eye className="h-4 w-4 text-red-500" />
                <div>
                  <p className="font-medium">Multiple Faces</p>
                  <p className="text-muted-foreground">Another person detected</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-background rounded border">
                <Smartphone className="h-4 w-4 text-red-500" />
                <div>
                  <p className="font-medium">Prohibited Object</p>
                  <p className="text-muted-foreground">Phone, tablet, or book</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Additional data (emotions, face pose, attention score) is collected for admin reports but does not trigger strikes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Changes indicator */}
      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">Unsaved changes</span>
          <Button size="sm" variant="secondary" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
}
