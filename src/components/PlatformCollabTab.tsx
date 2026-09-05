import React, { useState, useEffect, useCallback } from "react";
import { platformApi } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Edit,
  Trash2,
  Globe,
  CalendarDays,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Layers,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
} from "lucide-react";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
interface PlatformPartner {
  id: string;
  name: string;
  description?: string;
  base_url: string;
  is_enabled: number;
  agreement_start?: string;
  agreement_end?: string;
  created_at: string;
  is_expired: boolean;
  is_active_now: boolean;
}

type CourseMode = "groq" | "platform" | "combined";

const MODE_CONFIG: Record<CourseMode, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  groq: {
    label: "Groq AI Only",
    description: "Groq AI freely generates course suggestions — current default behaviour.",
    icon: <Sparkles className="h-5 w-5" />,
    color: "from-violet-600 to-indigo-600",
  },
  platform: {
    label: "Platform Only",
    description: "Show ONLY courses from your partner platforms. Groq AI is not used for course suggestions.",
    icon: <Layers className="h-5 w-5" />,
    color: "from-emerald-600 to-teal-600",
  },
  combined: {
    label: "Combined (Partner First)",
    description: "Partner platform courses appear at the top. Groq AI fills in additional suggestions below.",
    icon: <Link2 className="h-5 w-5" />,
    color: "from-orange-500 to-amber-500",
  },
};

const BLANK_FORM = {
  name: "",
  description: "",
  base_url: "",
  agreement_start: "",
  agreement_end: "",
  is_enabled: true,
};

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────
export default function PlatformCollabTab() {
  const [platforms, setPlatforms] = useState<PlatformPartner[]>([]);
  const [courseMode, setCourseMode] = useState<CourseMode>("groq");
  const [loading, setLoading] = useState(true);
  const [savingMode, setSavingMode] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<PlatformPartner | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<PlatformPartner | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, platformsRes] = await Promise.all([
        platformApi.getSettings(),
        platformApi.getAll(),
      ]);
      setCourseMode(settingsRes.mode || "groq");
      setPlatforms(platformsRes.platforms || []);
    } catch (err: any) {
      toast.error("Failed to load platform settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Mode toggle ──
  const handleModeChange = async (mode: CourseMode) => {
    if (mode === courseMode) return;
    setSavingMode(true);
    try {
      await platformApi.saveSettings(mode);
      setCourseMode(mode);
      toast.success(`Course mode set to: ${MODE_CONFIG[mode].label}`);
    } catch {
      toast.error("Failed to save mode");
    } finally {
      setSavingMode(false);
    }
  };

  // ── Open dialog ──
  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...BLANK_FORM });
    setShowDialog(true);
  };

  const openEdit = (p: PlatformPartner) => {
    setEditTarget(p);
    setForm({
      name: p.name,
      description: p.description || "",
      base_url: p.base_url,
      agreement_start: p.agreement_start || "",
      agreement_end: p.agreement_end || "",
      is_enabled: p.is_enabled === 1,
    });
    setShowDialog(true);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!form.name.trim() || !form.base_url.trim()) {
      toast.error("Platform name and URL are required");
      return;
    }
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(form.base_url.trim())) {
      toast.error("Please enter a valid URL starting with https://");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        base_url: form.base_url.trim(),
        agreement_start: form.agreement_start || undefined,
        agreement_end: form.agreement_end || undefined,
        is_enabled: form.is_enabled,
      };
      if (editTarget) {
        await platformApi.update(editTarget.id, payload);
        toast.success(`"${form.name}" updated successfully`);
      } else {
        await platformApi.create(payload);
        toast.success(`"${form.name}" added as a partner platform`);
      }
      setShowDialog(false);
      await load();
    } catch (err: any) {
      toast.error(err.message || "Failed to save platform");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle enable/disable ──
  const handleToggle = async (p: PlatformPartner) => {
    setTogglingId(p.id);
    try {
      await platformApi.update(p.id, {
        name: p.name,
        description: p.description,
        base_url: p.base_url,
        agreement_start: p.agreement_start,
        agreement_end: p.agreement_end,
        is_enabled: p.is_enabled !== 1,
      });
      toast.success(`"${p.name}" ${p.is_enabled === 1 ? "disabled" : "enabled"}`);
      await load();
    } catch {
      toast.error("Failed to update platform");
    } finally {
      setTogglingId(null);
    }
  };

  // ── Delete ──
  const handleDelete = async (p: PlatformPartner) => {
    setDeletingId(p.id);
    setShowDeleteConfirm(null);
    try {
      await platformApi.delete(p.id);
      toast.success(`"${p.name}" removed`);
      await load();
    } catch {
      toast.error("Failed to delete platform");
    } finally {
      setDeletingId(null);
    }
  };

  // ── Status badge ──
  const getStatusBadge = (p: PlatformPartner) => {
    if (p.is_expired)
      return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Expired</Badge>;
    if (p.is_enabled !== 1)
      return <Badge variant="outline" className="text-gray-500 text-xs">Disabled</Badge>;
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Active</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading platform settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6 text-primary" />
            Platform Collaborations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Partner with online learning platforms (Coursera, Udemy, etc.) and configure how their courses appear in AI-generated roadmaps and gap analyses.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* ── Course Mode Toggle ── */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">Course Recommendation Mode</CardTitle>
          <CardDescription>
            Control how courses appear when users generate roadmaps, gap analyses, or career plans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["groq", "platform", "combined"] as CourseMode[]).map((mode) => {
              const cfg = MODE_CONFIG[mode];
              const isSelected = courseMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  disabled={savingMode}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? "border-primary shadow-md bg-primary/5 ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40 bg-card"
                  }`}
                >
                  {/* Selected indicator */}
                  {isSelected && (
                    <div className={`absolute top-3 right-3 p-1.5 rounded-full bg-gradient-to-br ${cfg.color} text-white`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${cfg.color} text-white mb-3`}>
                    {cfg.icon}
                  </div>
                  <p className="font-semibold text-sm">{cfg.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{cfg.description}</p>
                  {/* Toggle 1/2/3 label */}
                  <span className="absolute top-3 left-3 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wide">
                    Toggle {mode === "groq" ? "1" : mode === "platform" ? "2" : "3"}
                  </span>
                </button>
              );
            })}
          </div>
          {savingMode && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-3">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving…
            </p>
          )}
          {courseMode !== "groq" && platforms.filter((p) => p.is_active_now).length === 0 && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-700 dark:text-amber-300 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>No active partner platforms configured. Add at least one platform below, or switch back to Groq AI Only mode.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Platform Partners Table ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Partner Platforms</CardTitle>
            <CardDescription>
              Groq AI will suggest courses from these platforms based on each user's skill gaps.
            </CardDescription>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Platform
          </Button>
        </CardHeader>
        <CardContent>
          {platforms.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
              <Globe className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm font-medium">No partner platforms yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                Add Coursera, Udemy, or any other platform you're partnering with.
              </p>
              <Button onClick={openCreate} variant="outline" size="sm" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Add First Platform
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {platforms.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    p.is_active_now
                      ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : p.is_expired
                      ? "border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/10 opacity-60"
                      : "border-border bg-muted/20"
                  }`}
                >
                  {/* Left: info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Logo/icon */}
                    <div className="h-11 w-11 rounded-lg bg-white dark:bg-card border flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                      <img
                        src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(p.base_url)}`}
                        alt={p.name}
                        className="h-8 w-8 object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{p.name}</span>
                        {getStatusBadge(p)}
                      </div>
                      <a
                        href={p.base_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 truncate max-w-xs mt-0.5"
                      >
                        <Globe className="h-3 w-3 shrink-0" />
                        {p.base_url}
                      </a>
                      {p.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-sm">{p.description}</p>
                      )}
                      {(p.agreement_start || p.agreement_end) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <CalendarDays className="h-3 w-3" />
                          {p.agreement_start || "—"} → {p.agreement_end || "ongoing"}
                          {p.is_expired && <span className="text-red-500 font-medium">(expired)</span>}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {/* Enable/Disable toggle */}
                    <button
                      onClick={() => handleToggle(p)}
                      disabled={togglingId === p.id}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title={p.is_enabled === 1 ? "Click to disable" : "Click to enable"}
                    >
                      {togglingId === p.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : p.is_enabled === 1 ? (
                        <ToggleRight className="h-6 w-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(p)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setShowDeleteConfirm(p)}
                      disabled={deletingId === p.id}
                    >
                      {deletingId === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Info Banner ── */}
      <Card className="bg-gradient-to-r from-primary/5 to-violet-500/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">How it works</p>
              <p className="text-xs text-muted-foreground mt-1">
                When a user generates a roadmap, gap analysis, or career plan, Groq AI receives the active partner platform URLs as instructions.
                It then suggests relevant courses directly from those platforms. In <strong>Platform Only</strong> mode, AI restricts suggestions to partner platforms.
                In <strong>Combined</strong> mode, partner courses appear first (with a partner badge) followed by any AI-generated suggestions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Platform Partner" : "Add Platform Partner"}</DialogTitle>
            <DialogDescription>
              Enter the platform's name and URL. Groq AI will suggest courses from this platform when it is active.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="pf-name">Platform Name *</Label>
                <Input
                  id="pf-name"
                  placeholder="e.g. Coursera, Udemy, edX…"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="pf-url">Platform URL *</Label>
                <Input
                  id="pf-url"
                  placeholder="https://coursera.org"
                  value={form.base_url}
                  onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Groq AI will generate course links pointing to this domain.</p>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="pf-desc">Description (optional)</Label>
                <Input
                  id="pf-desc"
                  placeholder="Brief description of the partnership…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-start">Agreement Start</Label>
                <Input
                  id="pf-start"
                  type="date"
                  value={form.agreement_start}
                  onChange={(e) => setForm((f) => ({ ...f, agreement_start: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-end">Agreement End</Label>
                <Input
                  id="pf-end"
                  type="date"
                  value={form.agreement_end}
                  onChange={(e) => setForm((f) => ({ ...f, agreement_end: e.target.value }))}
                />
              </div>
            </div>
            {/* Enable toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
              <div>
                <p className="text-sm font-medium">Enable Platform</p>
                <p className="text-xs text-muted-foreground">Show courses from this platform immediately</p>
              </div>
              <button
                onClick={() => setForm((f) => ({ ...f, is_enabled: !f.is_enabled }))}
                className="text-muted-foreground hover:text-foreground"
              >
                {form.is_enabled ? (
                  <ToggleRight className="h-7 w-7 text-emerald-500" />
                ) : (
                  <ToggleLeft className="h-7 w-7 text-gray-400" />
                )}
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editTarget ? "Update Platform" : "Add Platform"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Remove Platform
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{showDeleteConfirm?.name}</strong>? This cannot be undone.
              Existing roadmaps won't be affected, but new generations will no longer use this platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
