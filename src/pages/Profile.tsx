import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useUserProfile, 
  useUserStatistics, 
  useUserActivity, 
  useUserInterviews,
  useUserRound1Results,
  useBotInterviews,
  usePracticeInterviews,
  usePracticeAptitude 
} from '@/hooks/useDataQueries';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User, Mail, Phone, MapPin, Github, Linkedin, Code2, FileText,
  Briefcase, Target, TrendingUp, Calendar, Clock, Trash2, Upload,
  Save, Edit2, CheckCircle, BarChart3, Brain, MessageSquare,
  GraduationCap, Award, Activity, RefreshCw, ExternalLink, Trophy, ArrowRight, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getUserProfile,
  updateUserProfile,
  saveResumeToProfile,
  loadResumeFromProfile,
  deleteResumeFromProfile,
  getProfileAnalyses,
  getUserActivityHistory,
  getUserStatistics,
  updateUserInfo,
  logActivity,
  type UserProfile,
  type ProfileResponse,
  type ProfileAnalysis,
  type ActivityItem,
  type SavedResume,
} from '@/utils/profileService';
import {
  getUserInterviews,
  getRound1AptitudeResults,
  getBotInterviewHistory,
  getPracticeInterviewHistory,
  getPracticeAptitudeHistory,
  type BotInterviewResult,
  type PracticeInterviewResult,
  type PracticeAptitudeResult,
} from '@/lib/firebaseService';
import { InterviewSession, RoundOneAptitudeResult } from '@/types';

// ============== OVERVIEW TAB ==============
function OverviewTab({
  profile,
  userData,
  statistics,
  recentActivities,
  recentTimeline,
  onRefresh,
}: {
  profile: UserProfile | null;
  userData: ProfileResponse['user'] | null;
  statistics: {
    totalInterviews: number;
    totalPracticeSessions: number;
    totalAnalyses: number;
    totalResumeBuilds: number;
    totalCareerPlans: number;
  };
  recentActivities: ActivityItem[];
  recentTimeline: TimelineItem[];
  onRefresh: () => void;
}) {
  const statCards = [
    { label: 'Interviews', value: statistics.totalInterviews, icon: Briefcase, color: 'text-blue-500' },
    { label: 'Practice Sessions', value: statistics.totalPracticeSessions, icon: GraduationCap, color: 'text-green-500' },
    { label: 'Analyses', value: statistics.totalAnalyses, icon: BarChart3, color: 'text-purple-500' },
    { label: 'Resume Builds', value: statistics.totalResumeBuilds, icon: FileText, color: 'text-orange-500' },
    { label: 'Career Plans', value: statistics.totalCareerPlans, icon: Target, color: 'text-rose-500' },
  ];

  return (
    <div className="space-y-6">
      {/* User Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {userData?.name?.[0]?.toUpperCase() || userData?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{userData?.name || 'User'}</h2>
              <p className="text-sm text-muted-foreground">{userData?.email}</p>
              {userData?.target_role && (
                <Badge variant="secondary" className="mt-1">
                  <Target className="h-3 w-3 mr-1" />
                  {userData.target_role}
                </Badge>
              )}
              {userData?.bio && <p className="text-sm mt-2 text-muted-foreground">{userData.bio}</p>}
              <div className="flex flex-wrap gap-3 mt-3">
                {userData?.github_url && (
                  <a href={userData.github_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <Github className="h-3.5 w-3.5" /> GitHub
                  </a>
                )}
                {userData?.linkedin_url && (
                  <a href={userData.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                  </a>
                )}
                {userData?.leetcode_url && (
                  <a href={userData.leetcode_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                    <Code2 className="h-3.5 w-3.5" /> LeetCode
                  </a>
                )}
                {userData?.phone && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {userData.phone}
                  </span>
                )}
                {userData?.location && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {userData.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      {userData?.skills && userData.skills.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {userData.skills.map((skill, i) => (
                <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Resume Summary */}
      {profile?.saved_resume_name && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" /> Saved Resume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{profile.saved_resume_name}</p>
                <p className="text-xs text-muted-foreground">
                  Uploaded {profile.last_resume_upload ? new Date(profile.last_resume_upload).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              {profile.saved_resume_ats_score != null && (
                <div className="text-right">
                  <p className="text-lg font-bold">{profile.saved_resume_ats_score}%</p>
                  <p className="text-xs text-muted-foreground">ATS Score</p>
                </div>
              )}
            </div>
            {profile.saved_resume_skills && profile.saved_resume_skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {(profile.saved_resume_skills as string[]).slice(0, 10).map((skill, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                ))}
                {(profile.saved_resume_skills as string[]).length > 10 && (
                  <Badge variant="outline" className="text-xs">+{(profile.saved_resume_skills as string[]).length - 10} more</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Preview */}
      {recentTimeline.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTimeline.slice(0, 8).map((item) => (
                <TimelineRow key={item.id} item={item} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============== RESUME TAB ==============
function ResumeTab({
  profile,
  onResumeUpdate,
}: {
  profile: UserProfile | null;
  onResumeUpdate: () => void;
}) {
  const [savedResume, setSavedResume] = useState<SavedResume | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadResume = useCallback(async () => {
    setLoading(true);
    try {
      const resume = await loadResumeFromProfile();
      setSavedResume(resume);
    } catch {
      // No resume found
      setSavedResume(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadResume(); }, [loadResume]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      // Read file as text using FileReader
      const text = await readPdfText(file);
      const skills = extractSkillsFromText(text);
      const resumeInfo = extractResumeInfo(text);
      
      await saveResumeToProfile({
        name: file.name,
        text: text,
        skills: skills,
        ats_score: 0, // Will be updated when ATS analysis runs
        parsed_data: {
          ...resumeInfo,
          skills,
        },
      } as any);

      // Upload PDF to S3
      try {
        const { uploadResumeToS3 } = await import('@/lib/resumeService');
        const s3Key = await uploadResumeToS3(file);
        if (s3Key) console.log('☁️ Resume uploaded to S3:', s3Key);
      } catch { /* non-critical */ }
      
      toast.success('Resume saved to profile!');
      await loadResume();
      onResumeUpdate(); // This triggers full profile refetch so Settings UI updates too
      try { await logActivity('resume_upload', 'Uploaded resume to profile', `File: ${file.name}`); } catch { /* non-critical */ }
    } catch (error) {
      toast.error('Failed to save resume');
      console.error('Resume upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteResumeFromProfile();
      setSavedResume(null);
      toast.success('Resume removed from profile');
      onResumeUpdate();
    } catch {
      toast.error('Failed to delete resume');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading resume...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {savedResume ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {savedResume.name}
                  </CardTitle>
                  <CardDescription>
                    Uploaded {savedResume.uploaded_at ? new Date(savedResume.uploaded_at).toLocaleDateString() : 'recently'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <label>
                    <Button variant="outline" size="sm" asChild>
                      <span><Upload className="h-4 w-4 mr-1" /> Replace</span>
                    </Button>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                  </label>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {savedResume.ats_score != null && savedResume.ats_score > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">ATS Score</span>
                    <span className="text-sm font-bold">{savedResume.ats_score}%</span>
                  </div>
                  <Progress value={savedResume.ats_score} className="h-2" />
                </div>
              )}
              
              {savedResume.skills && savedResume.skills.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Extracted Skills ({savedResume.skills.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {savedResume.skills.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {savedResume.text && (
                <div>
                  <p className="text-sm font-medium mb-2">Resume Text Preview</p>
                  <div className="bg-muted/50 rounded-lg p-3 max-h-60 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                      {savedResume.text.substring(0, 2000)}
                      {savedResume.text.length > 2000 && '...'}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your resume is saved and will be available across all features via "Load from Profile" button.
              No need to re-upload!
            </AlertDescription>
          </Alert>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Resume Saved</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Upload your resume once and reuse it everywhere in VidyaMitra
            </p>
            <label className="cursor-pointer">
              <Button asChild disabled={uploading}>
                <span>
                  {uploading ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Upload className="h-4 w-4 mr-2" /> Upload Resume (PDF)</>
                  )}
                </span>
              </Button>
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============== ACTIVITY TAB ==============

// Unified timeline item for all history sources
interface TimelineItem {
  id: string;
  type: 'activity' | 'interview' | 'round1' | 'bot_interview' | 'practice_interview' | 'practice_aptitude';
  title: string;
  description?: string;
  score?: number;
  date: string;
  icon: typeof Activity;
  badge: string;
  badgeColor?: string;
  metadata?: Record<string, unknown>;
}

function buildTimeline(
  activities: ActivityItem[],
  interviews: InterviewSession[],
  round1Results: RoundOneAptitudeResult[],
  botInterviews: BotInterviewResult[],
  practiceInterviews: PracticeInterviewResult[],
  practiceAptitude: PracticeAptitudeResult[],
): TimelineItem[] {
  const items: TimelineItem[] = [];

  // Profile activities
  for (const a of activities) {
    items.push({
      id: `act-${a.id}`,
      type: 'activity',
      title: a.activity_title,
      description: a.activity_description,
      date: a.created_at,
      icon: ({ interview: Briefcase, practice: GraduationCap, resume_upload: FileText, analysis: BarChart3, career_plan: Target, bot_interview: MessageSquare, profile_update: User, resume_build: FileText, company_interview: Briefcase } as Record<string, typeof Activity>)[a.activity_type] || Activity,
      badge: a.activity_type?.replace(/_/g, ' ') || 'Activity',
    });
  }

  // Formal (proctored) mock interviews
  for (const i of interviews) {
    items.push({
      id: `int-${i.id}`,
      type: 'interview',
      title: `Mock Interview – ${i.roleName || i.roleId}`,
      description: i.aborted
        ? `Aborted: ${i.abortReason || 'Unknown reason'}`
        : `Score: ${i.score ?? 'N/A'}${i.outcome ? ` • ${i.outcome}` : ''}`,
      score: i.score,
      date: i.endTime || i.startTime || i.date,
      icon: Briefcase,
      badge: i.aborted ? 'Aborted' : i.isPracticeMode ? 'Practice' : 'Proctored',
      badgeColor: i.aborted ? 'destructive' : undefined,
      metadata: { roleId: i.roleId, round: i.round, questions: i.questions?.length, isPracticeMode: i.isPracticeMode },
    });
  }

  // Round 1 aptitude results
  for (const r of round1Results) {
    items.push({
      id: `r1-${r.id}`,
      type: 'round1',
      title: `Round 1 Aptitude – ${r.roleName || r.roleId}`,
      description: r.aborted
        ? `Aborted: ${r.abortReason || 'Proctoring violation'}`
        : `Score: ${r.score}% (${r.correctAnswers}/${r.totalQuestions})${r.selectedForRound2 ? ' • Selected for Round 2' : ''}`,
      score: r.score,
      date: r.completedAt,
      icon: Brain,
      badge: r.aborted ? 'Aborted' : 'Round 1',
      badgeColor: r.aborted ? 'destructive' : undefined,
      metadata: { roleId: r.roleId, selectedForRound2: r.selectedForRound2, roleNameStr: r.roleName || r.roleId },
    });
  }

  // Bot (AI) interviews
  for (const b of botInterviews) {
    const score = b.feedback?.overallScore;
    items.push({
      id: `bot-${b.id}`,
      type: 'bot_interview',
      title: `AI Interview – ${b.role || 'General'}`,
      description: `Candidate: ${b.candidateName}${score != null ? ` • Score: ${score}%` : ''}`,
      score,
      date: b.completedAt,
      icon: MessageSquare,
      badge: 'AI Interview',
      metadata: { role: b.role, candidateName: b.candidateName, questions: b.conversationLog?.length },
    });
  }

  // Practice interviews
  for (const p of practiceInterviews) {
    items.push({
      id: `pi-${p.id}`,
      type: 'practice_interview',
      title: `Practice Interview – ${p.roleName || p.roleId}`,
      description: `Score: ${p.overallScore ?? p.averageQuestionScore ?? 'N/A'}%`,
      score: p.overallScore || p.averageQuestionScore,
      date: p.completedAt,
      icon: GraduationCap,
      badge: 'Practice Interview',
      metadata: { roleId: p.roleId },
    });
  }

  // Practice aptitude
  for (const pa of practiceAptitude) {
    items.push({
      id: `pa-${pa.id}`,
      type: 'practice_aptitude',
      title: 'Practice Aptitude Test',
      description: `Score: ${pa.score}% (${pa.correctAnswers}/${pa.totalQuestions})`,
      score: pa.score,
      date: pa.completedAt,
      icon: Brain,
      badge: 'Practice Aptitude',
      metadata: { weakTopics: pa.weakTopics },
    });
  }

  // Sort newest first, deduplicate by id
  const seen = new Set<string>();
  return items
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
}

function ActivityTab() {
  const { user } = useAuth();
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [analyses, setAnalyses] = useState<ProfileAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'interviews' | 'analyses'>('all');

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const [acts, anls, interviews, round1, botInt, practiceInt, practiceApt] = await Promise.all([
          getUserActivityHistory(100),
          getProfileAnalyses(),
          getUserInterviews(user.id).then(all => all.filter(i => i.completed || i.aborted)).catch(() => [] as InterviewSession[]),
          getRound1AptitudeResults(user.id).catch(() => [] as RoundOneAptitudeResult[]),
          getBotInterviewHistory(user.id).catch(() => [] as BotInterviewResult[]),
          getPracticeInterviewHistory(user.id).catch(() => [] as PracticeInterviewResult[]),
          getPracticeAptitudeHistory(user.id).catch(() => [] as PracticeAptitudeResult[]),
        ]);
        setAnalyses(anls);
        setTimeline(buildTimeline(acts, interviews, round1, botInt, practiceInt, practiceApt));
      } catch (error) {
        console.error('Failed to load activity:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const filteredTimeline = tab === 'interviews'
    ? timeline.filter(t => ['interview', 'round1', 'bot_interview', 'practice_interview', 'practice_aptitude'].includes(t.type))
    : timeline;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading activity...</p>
        </CardContent>
      </Card>
    );
  }

  const interviewCount = timeline.filter(t => ['interview', 'round1', 'bot_interview', 'practice_interview', 'practice_aptitude'].includes(t.type)).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant={tab === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setTab('all')}>
          All Activity ({timeline.length})
        </Button>
        <Button variant={tab === 'interviews' ? 'default' : 'outline'} size="sm" onClick={() => setTab('interviews')}>
          Interviews & Tests ({interviewCount})
        </Button>
        <Button variant={tab === 'analyses' ? 'default' : 'outline'} size="sm" onClick={() => setTab('analyses')}>
          Analyses ({analyses.length})
        </Button>
      </div>

      {tab === 'analyses' ? (
        analyses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <BarChart3 className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No analyses recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <Card key={analysis.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm capitalize">{analysis.analysis_type?.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {analysis.created_at ? new Date(analysis.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    {analysis.score != null && (
                      <div className="text-right">
                        <p className="text-lg font-bold">{Math.round(analysis.score)}%</p>
                        <p className="text-xs text-muted-foreground">Score</p>
                      </div>
                    )}
                    <Badge variant={analysis.status === 'completed' ? 'default' : 'secondary'}>
                      {analysis.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        filteredTimeline.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Activity className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {tab === 'interviews' ? 'No interview or test history yet.' : 'No activity recorded yet. Start using VidyaMitra features!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-1">
                {filteredTimeline.map((item) => (
                  <TimelineRow key={item.id} item={item} />
                ))}
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

// ============== SETTINGS TAB ==============
function SettingsTab({
  userData,
  profile,
  onSave,
}: {
  userData: ProfileResponse['user'] | null;
  profile: UserProfile | null;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    location: '',
    bio: '',
    github_url: '',
    linkedin_url: '',
    leetcode_url: '',
    target_role: '',
    career_goals: '',
    skills: [] as string[],
  });
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userData) {
      setForm({
        name: userData.name || '',
        phone: userData.phone || '',
        location: userData.location || '',
        bio: userData.bio || '',
        github_url: userData.github_url || '',
        linkedin_url: userData.linkedin_url || '',
        leetcode_url: userData.leetcode_url || '',
        target_role: userData.target_role || '',
        career_goals: profile?.career_goals || '',
        skills: Array.isArray(userData.skills) ? userData.skills : [],
      });
    }
  }, [userData, profile]);

  const addSkill = () => {
    const skill = newSkill.trim();
    if (skill && !form.skills.includes(skill)) {
      setForm(prev => ({ ...prev, skills: [...prev.skills, skill] }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setForm(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skillToRemove) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update user info (including skills)
      await updateUserInfo({
        name: form.name,
        phone: form.phone,
        location: form.location,
        bio: form.bio,
        github_url: form.github_url,
        linkedin_url: form.linkedin_url,
        leetcode_url: form.leetcode_url,
        target_role: form.target_role,
        skills: form.skills,
      } as any);

      // Update profile fields
      await updateUserProfile({
        career_goals: form.career_goals,
        preferred_role: form.target_role,
      } as Partial<UserProfile>);

      toast.success('Profile updated successfully!');
      onSave();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" /> Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={userData?.email || ''} disabled className="opacity-60" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={e => updateField('location', e.target.value)} placeholder="City, Country" />
            </div>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" value={form.bio} onChange={e => updateField('bio', e.target.value)} placeholder="Tell us about yourself..." rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Career */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" /> Career
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="target_role">Target Role</Label>
            <Input id="target_role" value={form.target_role} onChange={e => updateField('target_role', e.target.value)} placeholder="e.g. Full Stack Developer" />
          </div>
          <div>
            <Label htmlFor="career_goals">Career Goals</Label>
            <Textarea id="career_goals" value={form.career_goals} onChange={e => updateField('career_goals', e.target.value)} placeholder="What are your career aspirations?" rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Award className="h-4 w-4" /> Skills
            {form.skills.length > 0 && (
              <Badge variant="secondary" className="ml-auto text-xs">{form.skills.length} skills</Badge>
            )}
          </CardTitle>
          <CardDescription>Skills extracted from your resume. You can add or remove them.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
              placeholder="Type a skill and press Enter"
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={addSkill} disabled={!newSkill.trim()}>Add</Button>
          </div>
          {form.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {form.skills.map((skill, i) => (
                <Badge key={i} variant="secondary" className="text-xs pr-1 flex items-center gap-1">
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                    type="button"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No skills yet. Upload a resume or add skills manually.</p>
          )}
        </CardContent>
      </Card>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ExternalLink className="h-4 w-4" /> Social Links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="github">GitHub URL</Label>
            <Input id="github" value={form.github_url} onChange={e => updateField('github_url', e.target.value)} placeholder="https://github.com/username" />
          </div>
          <div>
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input id="linkedin" value={form.linkedin_url} onChange={e => updateField('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/username" />
          </div>
          <div>
            <Label htmlFor="leetcode">LeetCode URL</Label>
            <Input id="leetcode" value={form.leetcode_url} onChange={e => updateField('leetcode_url', e.target.value)} placeholder="https://leetcode.com/username" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Save Changes</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============== SHARED COMPONENTS ==============
function ActivityRow({ item, showDetails }: { item: ActivityItem; showDetails?: boolean }) {
  const iconMap: Record<string, typeof Activity> = {
    interview: Briefcase,
    practice: GraduationCap,
    resume_upload: FileText,
    analysis: BarChart3,
    career_plan: Target,
    bot_interview: MessageSquare,
    profile_update: User,
    resume_build: FileText,
  };
  const Icon = iconMap[item.activity_type] || Activity;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0 border-border/30">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.activity_title}</p>
        {showDetails && item.activity_description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.activity_description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          <Clock className="h-3 w-3 inline mr-1" />
          {item.created_at ? formatRelativeTime(item.created_at) : 'N/A'}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] capitalize shrink-0">
        {item.activity_type?.replace(/_/g, ' ')}
      </Badge>
    </div>
  );
}

function TimelineRow({ item }: { item: TimelineItem }) {
  const Icon = item.icon;
  const isHistoryItem = item.type !== 'activity';
  const navigate = useNavigate();

  // Special highlight for Round 2 selected items
  const isRound2Selected = item.type === 'round1' && item.metadata?.selectedForRound2 === true;

  if (isRound2Selected) {
    return (
      <div className="relative overflow-hidden rounded-xl border-2 border-green-500/40 bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-green-500/5 p-3 my-1">
        {/* Subtle pulse glow */}
        <div className="absolute inset-0 rounded-xl bg-green-500/5 animate-pulse" />
        <div className="relative flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-md shadow-green-500/30">
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate">{item.title}</p>
              <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold border border-green-500/30">✓ SELECTED</span>
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              <Clock className="h-3 w-3 inline mr-1" />
              {item.date ? formatRelativeTime(item.date) : 'N/A'}
            </p>
            <button
              onClick={() => navigate(`/round2-coding?roleName=${encodeURIComponent(String(item.metadata?.roleNameStr || item.title.replace('Round 1 Aptitude – ', '')))}&roleId=${encodeURIComponent(String(item.metadata?.roleId || ''))}`)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 px-3 py-1.5 rounded-lg shadow-md shadow-green-500/20 transition-all hover:shadow-green-500/40"
            >
              <Sparkles className="h-3 w-3" />
              Attend Round 2 Coding
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {item.score != null && (
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold ${item.score >= 70 ? 'text-green-500' : item.score >= 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                {Math.round(item.score)}%
              </p>
              <p className="text-[10px] text-muted-foreground">Round 1</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default row for all other item types
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-0 border-border/30">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isHistoryItem ? 'bg-violet-500/10' : 'bg-primary/10'}`}>
        <Icon className={`h-4 w-4 ${isHistoryItem ? 'text-violet-500' : 'text-primary'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          <Clock className="h-3 w-3 inline mr-1" />
          {item.date ? formatRelativeTime(item.date) : 'N/A'}
        </p>
      </div>
      {item.score != null && (
        <div className="text-right shrink-0 mr-2">
          <p className={`text-sm font-bold ${item.score >= 70 ? 'text-green-600' : item.score >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
            {typeof item.score === 'number' && item.score <= 10 ? item.score.toFixed(1) : Math.round(item.score)}
            {typeof item.score === 'number' && item.score > 10 ? '%' : '/10'}
          </p>
        </div>
      )}
      <Badge variant={item.badgeColor === 'destructive' ? 'destructive' : 'outline'} className="text-[10px] capitalize shrink-0">
        {item.badge}
      </Badge>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

// Proper PDF text extraction using pdfjs-dist (handles compressed streams correctly)
async function readPdfText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      pages.push(pageText);
    }

    const fullText = pages.join('\n').replace(/\s+/g, ' ').trim();
    return fullText || file.name;
  } catch (err) {
    console.error('PDF parse error:', err);
    return file.name;
  }
}

// Basic skill extraction from text
function extractSkillsFromText(text: string): string[] {
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin',
    'React', 'Angular', 'Vue', 'Next.js', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
    'HTML', 'CSS', 'Tailwind', 'Bootstrap', 'SASS', 'SCSS',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'SQLite', 'Firebase',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform',
    'Git', 'GitHub', 'GitLab', 'CI/CD', 'Jenkins',
    'REST', 'GraphQL', 'gRPC', 'WebSocket',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP',
    'Figma', 'Sketch', 'Adobe XD',
    'Agile', 'Scrum', 'Jira',
    'Linux', 'Bash', 'PowerShell',
  ];
  const lowerText = text.toLowerCase();
  return commonSkills.filter(skill => lowerText.includes(skill.toLowerCase()));
}

// Extract structured data from resume text (name, email, phone, education, experience)
function extractResumeInfo(text: string): Record<string, any> {
  const info: Record<string, any> = {};

  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) info.email = emailMatch[0];

  // Phone (Indian & international formats)
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/);
  if (phoneMatch) info.phone = phoneMatch[0].trim();

  // Try to extract name (first line that looks like a name — capitalized words, no special chars)
  const lines = text.split(/\n|\s{3,}/).map(l => l.trim()).filter(l => l.length > 2 && l.length < 60);
  for (const line of lines.slice(0, 10)) {
    // A name is typically 2-4 capitalized words with no digits or special chars
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+){0,3}$/.test(line) && !/@/.test(line)) {
      info.name = line;
      break;
    }
  }

  // Education — look for keywords near content
  const eduKeywords = /\b(education|university|college|bachelor|master|b\.?tech|m\.?tech|b\.?e|m\.?e|b\.?sc|m\.?sc|b\.?a|m\.?a|bca|mca|diploma|ph\.?d|degree)\b/i;
  const eduLines: string[] = [];
  const allLines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  let inEdu = false;
  for (const line of allLines) {
    if (eduKeywords.test(line)) { inEdu = true; }
    if (inEdu) {
      eduLines.push(line);
      if (eduLines.length > 6) break;
    }
    if (inEdu && /\b(experience|work|project|skill)/i.test(line) && eduLines.length > 1) break;
  }
  if (eduLines.length > 0) info.education = eduLines.join(' | ').substring(0, 1000);

  // Experience — look for keywords
  const expKeywords = /\b(experience|work history|employment|professional background|internship)\b/i;
  const expLines: string[] = [];
  let inExp = false;
  for (const line of allLines) {
    if (expKeywords.test(line)) { inExp = true; }
    if (inExp) {
      expLines.push(line);
      if (expLines.length > 8) break;
    }
    if (inExp && /\b(education|project|skill|certification)/i.test(line) && expLines.length > 1) break;
  }
  if (expLines.length > 0) info.experience = expLines.join(' | ').substring(0, 1000);

  return info;
}

// ============== MAIN PROFILE PAGE ==============
const Profile = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Use React Query hooks for cached data
  const { data: profileResp, isLoading: profileLoading, refetch: refetchProfile } = useUserProfile(user?.id);
  const { data: stats, isLoading: statsLoading } = useUserStatistics(user?.id);
  const { data: activities = [], isLoading: activitiesLoading } = useUserActivity(user?.id);
  const { data: interviews = [], isLoading: interviewsLoading } = useUserInterviews(user?.id);
  const { data: round1 = [], isLoading: round1Loading } = useUserRound1Results(user?.id);
  const { data: botInt = [], isLoading: botLoading } = useBotInterviews(user?.id);
  const { data: practiceInt = [], isLoading: practiceIntLoading } = usePracticeInterviews(user?.id);
  const { data: practiceApt = [], isLoading: practiceAptLoading } = usePracticeAptitude(user?.id);

  const loading = profileLoading || statsLoading || activitiesLoading || 
                  interviewsLoading || round1Loading || botLoading || 
                  practiceIntLoading || practiceAptLoading;

  // Compute statistics from cached data
  const statistics = stats || {
    totalInterviews: 0,
    totalPracticeSessions: 0,
    totalAnalyses: 0,
    totalResumeBuilds: 0,
    totalCareerPlans: 0,
  };

  const recentActivities = activities;

  // Build timeline from cached data
  const recentTimeline = useMemo(() => {
    const completedInterviews = interviews.filter(i => i.completed || i.aborted);
    return buildTimeline(activities, completedInterviews, round1, botInt, practiceInt, practiceApt);
  }, [activities, interviews, round1, botInt, practiceInt, practiceApt]);

  const profileData = profileResp;

  // Refresh handler
  const loadProfileData = useCallback(async () => {
    refetchProfile();
  }, [refetchProfile]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your profile, resume, and track your progress</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadProfileData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <OverviewTab
              profile={profileData?.profile || null}
              userData={profileData?.user || null}
              statistics={statistics}
              recentActivities={recentActivities}
              recentTimeline={recentTimeline}
              onRefresh={loadProfileData}
            />
          </TabsContent>

          <TabsContent value="resume" className="mt-6">
            <ResumeTab
              profile={profileData?.profile || null}
              onResumeUpdate={loadProfileData}
            />
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <ActivityTab />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <SettingsTab
              userData={profileData?.user || null}
              profile={profileData?.profile || null}
              onSave={loadProfileData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Profile;
