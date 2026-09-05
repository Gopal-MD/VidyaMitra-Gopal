import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, XCircle,
  Target, Brain, Github, Code, BarChart3, Calendar, Clock, Award,
  Sparkles, RefreshCw, Filter, ArrowUpDown, ExternalLink, Info, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getAuthToken } from '@/lib/api';
import mermaid from 'mermaid';

// ============================================================================
// TYPES
// ============================================================================

interface FutureReadyScore {
  overall: number;
  grade: string;
  resume_match: number;
  github_match: number;
  assessment_performance: number;
  market_alignment: number;
}

interface SkillGap {
  skill: string;
  user_score: number;
  market_score: number;
  gap: number;
  priority: 'CRITICAL' | 'IMPORTANT' | 'MONITOR' | 'STRENGTH' | 'RESKILL_ALERT';
  trend: string;
  growth_rate: number;
  estimated_hours: number;
  category: string;
}

interface ProfileConflict {
  type: 'CLAIMED_UNPROVEN' | 'PROVEN_UNCLAIMED' | 'ASSESSMENT_CONTRADICTION';
  skill: string;
  description: string;
  action: string;
  severity: 'high' | 'medium' | 'low';
}

interface GapAnalysis {
  id: string;
  target_role: string;
  future_ready_score: FutureReadyScore;
  skill_gaps: SkillGap[];
  profile_conflicts: ProfileConflict[];
  job_ready_date: string;
  job_ready_months: number;
}

interface CourseResource {
  name: string;
  platform: string;
  duration: string;
  free: boolean;
  url: string;
}

interface RoadmapSkill {
  skill: string;
  priority: string;
  hours: number;
  courses: CourseResource[];
}

interface RoadmapMonth {
  month: number;
  title: string;
  skills: RoadmapSkill[];
  total_hours: number;
  projected_score_improvement: number;
}

interface Roadmap {
  id: string;
  mermaid_code: string;
  monthly_plan: RoadmapMonth[];
  total_months: number;
  total_hours: number;
  job_ready_date: string;
}

interface AINarrative {
  executive_summary: string;
  critical_insights: Array<{ skill: string; insight: string }>;
  strength_callout: string;
  motivational_closing: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const GapAnalysis = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analysis, setAnalysis] = useState<GapAnalysis | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [narrative, setNarrative] = useState<AINarrative | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [useCustomRole, setUseCustomRole] = useState(false);

  // UI state
  const [selectedSkill, setSelectedSkill] = useState<SkillGap | null>(null);
  const [skillExplanation, setSkillExplanation] = useState<{ why_matters: string; how_to_prove: string; project_idea: string } | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('gap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Initialize Mermaid with theme matching current color scheme
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'neutral',
      themeVariables: isDark ? {
        primaryColor: '#4f46e5',
        primaryTextColor: '#fff',
        primaryBorderColor: '#6366f1',
        lineColor: '#818cf8',
        secondaryColor: '#10b981',
        tertiaryColor: '#f59e0b',
      } : {
        primaryColor: '#7c3aed',
        primaryTextColor: '#1e1b4b',
        primaryBorderColor: '#6d28d9',
        lineColor: '#6d28d9',
        secondaryColor: '#059669',
        tertiaryColor: '#d97706',
      },
    });
  }, []);

  // Load existing analysis on mount
  useEffect(() => {
    if (user) {
      console.log('✅ User authenticated:', { id: user.id, email: user.email });
      loadAnalysis();
    } else {
      console.log('⚠️ No authenticated user found');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Render Mermaid when roadmap changes
  useEffect(() => {
    if (roadmap && roadmap.mermaid_code) {
      renderMermaid();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roadmap]);

  const renderMermaid = async () => {
    const element = document.getElementById('mermaid-roadmap');
    if (element && roadmap) {
      try {
        element.innerHTML = roadmap.mermaid_code;
        await mermaid.run({ nodes: [element] });
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
    }
  };

  const loadAnalysis = async () => {
    if (!user?.id) {
      console.log('No user ID, skipping analysis load');
      return;
    }

    try {
      // Get authentication token
      const token = getAuthToken();
      if (!token) {
        console.log('No auth token found');
        return;
      }

      const res = await fetch(`/api/analysis/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        console.log('Unauthorized - please log in');
        toast.error('Please log in to view gap analysis');
        navigate('/login');
        return;
      }

      if (res.status === 404) {
        console.log('📋 No previous analysis found - ready to run new analysis');
        return; // This is fine, user hasn't run analysis yet
      }

      if (!res.ok) {
        console.log(`📋 No previous analysis available (status: ${res.status})`);
        return; // Don't try to parse HTML as JSON
      }

      // Only parse JSON if response is OK
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('📋 No previous analysis available - ready to run new analysis');
        return;
      }

      const data = await res.json();
      
      // Validate and set analysis with safe defaults
      if (data && data.analysis) {
        const safeAnalysis = {
          ...data.analysis,
          skill_gaps: Array.isArray(data.analysis.skill_gaps) ? data.analysis.skill_gaps : [],
          profile_conflicts: Array.isArray(data.analysis.profile_conflicts) ? data.analysis.profile_conflicts : [],
          future_ready_score: data.analysis.future_ready_score || { overall: 0, grade: 'F', resume_match: 0, github_match: 0, assessment_performance: 0, market_alignment: 0 }
        };
        setAnalysis(safeAnalysis);
        setTargetRole(safeAnalysis.target_role || '');
        
        // Load AI narrative
        fetchNarrative(safeAnalysis);
      }

      // Load roadmap
      const roadmapRes = await fetch(`/api/roadmap/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (roadmapRes.ok) {
        const roadmapData = await roadmapRes.json();
        if (roadmapData && roadmapData.roadmap) {
          setRoadmap(roadmapData.roadmap);
        }
      }
    } catch (err) {
      console.error('Failed to load analysis:', err);
      // Don't show error toast - this is just a background load
    }
  };

  const runAnalysis = async () => {
    if (!targetRole.trim()) {
      toast.error('Please select a target role');
      return;
    }

    if (!user?.id) {
      toast.error('Please log in to run analysis');
      navigate('/login');
      return;
    }

    // Get authentication token
    const token = getAuthToken();
    if (!token) {
      toast.error('Authentication required. Please log in.');
      navigate('/login');
      return;
    }

    setLoading(true);
    
    // Show progress toast
    const loadingToast = toast.loading('🔍 Fetching real-time market data from job boards...');
    
    try {
      // Step 1: Run gap analysis with real-time market data
      const res = await fetch('/api/analysis/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetRole }),
      });

      if (res.status === 401) {
        toast.dismiss(loadingToast);
        toast.error('Session expired. Please log in again.');
        navigate('/login');
        return;
      }

      if (!res.ok) {
        let errorMessage = 'Analysis failed';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error (${res.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      
      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(`✅ Analysis complete! Found ${data.analysis.skill_gaps.length} skills to track`);

      // Step 2: Generate roadmap
      setGenerating(true);
      const roadmapToast = toast.loading('📚 Generating personalized learning roadmap...');
      
      const roadmapRes = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetRole,
          gapAnalysisId: data.analysis.id,
        }),
      });

      toast.dismiss(roadmapToast);
      if (roadmapRes.ok) {
        const roadmapData = await roadmapRes.json();
        setRoadmap(roadmapData.roadmap);
        toast.success(`🎯 ${roadmapData.roadmap.total_months}-month roadmap ready with ${roadmapData.roadmap.total_hours} hours of learning!`);
      } else {
        toast.error('Failed to generate roadmap');
      }

      // Step 3: Fetch AI narrative (no toast - happens in background)
      fetchNarrative(data.analysis);
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      console.error('Analysis error:', err);
      toast.error(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const fetchNarrative = async (analysisData: GapAnalysis) => {
    try {
      const res = await fetch('/api/analysis/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole: analysisData.target_role,
          futureReadyScore: analysisData.future_ready_score,
          skillGaps: analysisData.skill_gaps.slice(0, 10),
          profileConflicts: analysisData.profile_conflicts,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNarrative(data.narrative);
      } else {
        console.log(`📝 AI narrative unavailable (status: ${res.status}) - continuing without it`);
        // Don't show error toast - narrative is optional, analysis still works
        try {
          const errorData = await res.json();
          console.log('📝 Narrative error details:', errorData.error);
        } catch {
          // Silently continue - narrative is optional
        }
      }
    } catch (err) {
      console.error('Failed to fetch narrative:', err);
      // Don't show error toast - narrative is optional
    }
  };

  const fetchSkillExplanation = async (gap: SkillGap) => {
    try {
      const res = await fetch('/api/analysis/skill-explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill: gap.skill,
          userScore: gap.user_score,
          marketScore: gap.market_score,
          targetRole: analysis?.target_role || 'this role',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSkillExplanation(data.explanation);
      } else {
        console.log(`📚 Skill explanation unavailable (status: ${res.status})`);
        toast.error('Could not generate skill explanation. Please try again.');
      }
    } catch (err) {
      console.error('Failed to fetch skill explanation:', err);
      toast.error('Network error. Please check your connection.');
    }
  };

  const handleSkillClick = (gap: SkillGap) => {
    setSelectedSkill(gap);
    setSkillExplanation(null);
    fetchSkillExplanation(gap);
  };

  // Priority colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'IMPORTANT': return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'MONITOR': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'STRENGTH': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'RESKILL_ALERT': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/50';
    }
  };

  // Filter and sort gaps
  const getFilteredGaps = () => {
    if (!analysis || !Array.isArray(analysis.skill_gaps)) return [];
    let filtered = [...analysis.skill_gaps];

    if (filterPriority !== 'all') {
      filtered = filtered.filter(g => g && g.priority === filterPriority);
    }

    // Sort
    filtered = filtered.sort((a, b) => {
      if (!a || !b) return 0;
      let aVal = 0, bVal = 0;
      if (sortBy === 'gap') {
        aVal = Math.abs(a.gap || 0);
        bVal = Math.abs(b.gap || 0);
      } else if (sortBy === 'user_score') {
        aVal = a.user_score || 0;
        bVal = b.user_score || 0;
      } else if (sortBy === 'market_score') {
        aVal = a.market_score || 0;
        bVal = b.market_score || 0;
      } else if (sortBy === 'hours') {
        aVal = a.estimated_hours || 0;
        bVal = b.estimated_hours || 0;
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (!user) {
    return (
      <Layout>
        <Card className="max-w-2xl mx-auto mt-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              You need to be logged in to access the Career Gap Analysis feature.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The Gap Analysis feature helps you:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
              <li>Compare your skills with real-time market demand</li>
              <li>Get personalized learning roadmaps</li>
              <li>Track your career readiness score</li>
              <li>Receive AI-powered career guidance</li>
            </ul>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
              size="lg"
            >
              Login to Continue
            </Button>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-12">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Career Gap Analysis</h1>
              <p className="text-sm text-muted-foreground">AI-powered skill gaps &amp; personalized 12-month learning roadmap</p>
            </div>
          </div>
          {analysis && (
            <Button
              onClick={runAnalysis}
              disabled={loading || generating}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0 shadow-lg shadow-violet-500/20"
            >
              {loading ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><Sparkles className="h-4 w-4 mr-2" />Refresh Analysis</>}
            </Button>
          )}
        </div>

        {/* ── PRE-ANALYSIS STATE ── */}
        {!analysis && (
          <div className="max-w-xl mx-auto space-y-4">
            <Alert className="border-violet-500/30 bg-violet-500/5">
              <Info className="h-4 w-4 text-violet-500" />
              <AlertDescription className="text-sm">
                <strong>For best results:</strong> Upload your resume and complete some practice sessions first.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2"><Target className="h-4 w-4 text-violet-500" /> Select Target Role</span>
                  <Button variant="ghost" size="sm" onClick={() => { setUseCustomRole(!useCustomRole); setTargetRole(''); }} className="text-xs text-violet-500 h-7">
                    {useCustomRole ? 'Use Preset' : 'Custom Role'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {useCustomRole ? (
                  <Input placeholder="e.g., Blockchain Developer, Game Developer..." value={targetRole} onChange={(e) => setTargetRole(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && runAnalysis()} autoFocus />
                ) : (
                  <Select value={targetRole} onValueChange={setTargetRole}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select your target role..." /></SelectTrigger>
                    <SelectContent>
                      {[
                        ['Full Stack Developer','🌐'],['Frontend Developer','🎨'],['Backend Developer','⚙️'],
                        ['Mobile Developer','📱'],['DevOps Engineer','🔧'],['Data Scientist','📊'],
                        ['Data Engineer','🔢'],['Machine Learning Engineer','🤖'],['AI Engineer','🧠'],
                        ['Cloud Architect','☁️'],['Software Architect','🏗️'],['Security Engineer','🔒'],
                        ['QA Engineer','✅'],['Site Reliability Engineer','⚡'],['Platform Engineer','🚀'],
                        ['Embedded Systems Engineer','🔌'],['Database Administrator','🗄️'],['Solutions Architect','💡'],
                        ['Technical Lead','👨‍💼'],['Engineering Manager','📋'],
                      ].map(([role, icon]) => <SelectItem key={role} value={role}>{icon} {role}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Button onClick={runAnalysis} disabled={loading || !targetRole.trim()} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white border-0 h-11 font-semibold shadow-lg shadow-violet-500/20">
                  {loading ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : <><Sparkles className="h-4 w-4 mr-2" />Run Gap Analysis</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── ANALYSIS RESULTS ── */}
        {analysis && (
          <>
            {/* Job-Ready Banner */}
            <div className="rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-purple-500/5 to-transparent p-5 text-center space-y-2">
              <Badge className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 mb-1">
                <Sparkles className="h-3 w-3 mr-1" /> AI Analysis Complete
              </Badge>
              <h2 className="text-xl md:text-2xl font-bold">
                Job-ready as a{' '}
                <span className="text-violet-600 dark:text-violet-400">{analysis.target_role}</span>
                {' '}by{' '}
                <span className="text-teal-600 dark:text-teal-400">{analysis.job_ready_date}</span>
              </h2>
              <div className="flex items-center justify-center gap-5 text-sm text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-violet-500" /><strong className="text-foreground">{analysis.job_ready_months}</strong> months</span>
                <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-teal-500" /><strong className="text-foreground">{roadmap?.total_hours || 0}</strong> total hours</span>
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-500" />~20h/month</span>
              </div>
            </div>

            {/* Score Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Gauge */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Future-Ready Score</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-3 pt-1">
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                      <motion.circle cx="50" cy="50" r="42" fill="none" stroke="url(#scoreGrad)" strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 42}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - analysis.future_ready_score.overall / 100) }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                      />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">{analysis.future_ready_score.overall}</span>
                      <span className="text-lg font-semibold text-muted-foreground">{analysis.future_ready_score.grade}</span>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">Based on resume, practice &amp; market fit</p>
                </CardContent>
              </Card>

              {/* Score Breakdown */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Resume Match', value: analysis.future_ready_score.resume_match, icon: Award, color: 'text-blue-500', tip: analysis.future_ready_score.resume_match < 50 ? 'Upload Resume' : null },
                    { label: 'GitHub Activity', value: analysis.future_ready_score.github_match, icon: Github, color: 'text-purple-500', tip: analysis.future_ready_score.github_match < 40 ? 'Connect GitHub' : null },
                    { label: 'Skills Verified', value: analysis.future_ready_score.assessment_performance, icon: Code, color: 'text-teal-500', tip: analysis.future_ready_score.assessment_performance < 50 ? 'Take Assessment' : null },
                    { label: 'Market Alignment', value: analysis.future_ready_score.market_alignment, icon: BarChart3, color: 'text-green-500', tip: null },
                  ].map(({ label, value, icon: Icon, color, tip }, i) => (
                    <motion.div key={label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${color}`} />
                          {label}
                          {tip && <Badge variant="outline" className="text-[10px] ml-1">{tip}</Badge>}
                        </span>
                        <span className="text-sm font-bold">{value}%</span>
                      </div>
                      <Progress value={value} className="h-1.5" />
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* AI Narrative */}
            {narrative && (
              <Card className="border-violet-500/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-violet-500" /> AI Career Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed">{narrative.executive_summary}</p>
                  {narrative.critical_insights.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wide flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5" />Critical Focus Areas</h4>
                      {narrative.critical_insights.map((insight, idx) => (
                        <div key={idx} className="pl-3 border-l-2 border-red-500/40">
                          <p className="text-xs font-semibold">{insight.skill}</p>
                          <p className="text-xs text-muted-foreground">{insight.insight}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Your Strength</p>
                    <p className="text-xs text-muted-foreground">{narrative.strength_callout}</p>
                  </div>
                  <p className="text-xs text-teal-600 dark:text-teal-400 italic">{narrative.motivational_closing}</p>
                </CardContent>
              </Card>
            )}

            {/* Skill Gap Table */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-500" />Skill Gap Breakdown</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Click any row for AI-powered guidance</CardDescription>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {[['all','All'],['CRITICAL','Critical'],['IMPORTANT','Important'],['STRENGTH','Strengths']].map(([val, label]) => (
                      <Button key={val} variant={filterPriority === val ? 'default' : 'outline'} size="sm" onClick={() => setFilterPriority(val)}
                        className={`text-xs h-7 ${filterPriority === val ? val === 'CRITICAL' ? 'bg-red-500 hover:bg-red-600 border-0' : val === 'IMPORTANT' ? 'bg-amber-500 hover:bg-amber-600 border-0' : val === 'STRENGTH' ? 'bg-green-500 hover:bg-green-600 border-0' : 'bg-violet-600 hover:bg-violet-700 border-0' : ''}`}>
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground" onClick={() => toggleSort('skill')}>Skill <ArrowUpDown className="h-3 w-3 inline ml-1" /></th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground" onClick={() => toggleSort('user_score')}>You <ArrowUpDown className="h-3 w-3 inline ml-1" /></th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground" onClick={() => toggleSort('market_score')}>Market <ArrowUpDown className="h-3 w-3 inline ml-1" /></th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground" onClick={() => toggleSort('gap')}>Gap <ArrowUpDown className="h-3 w-3 inline ml-1" /></th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Trend</th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Priority</th>
                        <th className="text-left py-2.5 px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide cursor-pointer hover:text-foreground" onClick={() => toggleSort('hours')}>Hours <ArrowUpDown className="h-3 w-3 inline ml-1" /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredGaps().slice(0, 20).map((gap, idx) => (
                        <motion.tr key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                          className="border-b border-border/50 hover:bg-muted/40 cursor-pointer transition-colors"
                          onClick={() => handleSkillClick(gap)}>
                          <td className="py-3 px-4 font-medium">{gap.skill}</td>
                          <td className="py-3 px-3 text-muted-foreground">{gap.user_score}</td>
                          <td className="py-3 px-3 text-muted-foreground">{gap.market_score}</td>
                          <td className="py-3 px-3 font-semibold"><span className={gap.gap > 0 ? 'text-red-500' : 'text-green-500'}>{gap.gap > 0 ? '+' : ''}{Math.round(gap.gap)}</span></td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {gap.trend === 'rising' && <TrendingUp className="h-3 w-3 text-green-500" />}
                              {gap.trend === 'declining' && <TrendingDown className="h-3 w-3 text-red-500" />}
                              {gap.trend === 'stable' && <Minus className="h-3 w-3 text-muted-foreground" />}
                              {gap.growth_rate > 0 ? '+' : ''}{gap.growth_rate}%
                            </div>
                          </td>
                          <td className="py-3 px-3"><Badge variant="outline" className={`text-[10px] ${getPriorityColor(gap.priority)}`}>{gap.priority.replace('_', ' ')}</Badge></td>
                          <td className="py-3 px-3 text-muted-foreground">{gap.estimated_hours}h</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Skill Modal */}
            <AnimatePresence>
              {selectedSkill && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={() => setSelectedSkill(null)}>
                  <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
                    className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold">{selectedSkill.skill}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`text-xs ${getPriorityColor(selectedSkill.priority)}`}>{selectedSkill.priority}</Badge>
                          <span className="text-xs text-muted-foreground">{selectedSkill.user_score}/100 → {selectedSkill.market_score}/100</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedSkill(null)} className="h-8 w-8 p-0"><XCircle className="h-4 w-4" /></Button>
                    </div>
                    {skillExplanation ? (
                      <div className="space-y-3">
                        {[
                          { label: 'Why This Matters', val: skillExplanation.why_matters, color: 'text-violet-500' },
                          { label: 'How to Prove It', val: skillExplanation.how_to_prove, color: 'text-teal-500' },
                          { label: 'Project Idea', val: skillExplanation.project_idea, color: 'text-amber-500' },
                        ].map(({ label, val, color }) => (
                          <div key={label} className="p-3 rounded-lg bg-muted/50">
                            <p className={`text-xs font-semibold ${color} mb-1`}>{label}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed">{val}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-violet-500" /></div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Profile Conflicts */}
            {analysis.profile_conflicts && analysis.profile_conflicts.length > 0 ? (
              <Card className="border-red-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Profile Conflicts
                    <Badge className="bg-red-500/10 text-red-500 border-red-500/30 ml-1">{analysis.profile_conflicts.length}</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">Fix these to boost your readiness score</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {analysis.profile_conflicts.map((c, idx) => {
                    const skill = c.skill || `Conflict ${idx + 1}`;
                    const desc = c.description || 'Review this profile item';
                    const action = c.action || 'Update your profile to fix this';
                    const isHigh = c.severity === 'high';
                    return (
                      <div key={idx} className={`p-3 rounded-lg border ${isHigh ? 'border-red-500/20 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isHigh ? 'text-red-500' : 'text-amber-500'}`} />
                          <div>
                            <p className="text-sm font-medium">{skill}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />{action}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : (
              <Alert className="border-green-500/30 bg-green-500/5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-600 dark:text-green-400 text-sm">No profile conflicts detected. Your profile is consistent!</AlertDescription>
              </Alert>
            )}

            {/* Learning Roadmap */}
            {roadmap && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Learning Roadmap</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <Card className="border-violet-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-4 w-4 text-violet-500" />
                      {roadmap.total_months || 12}-Month Visual Roadmap
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {roadmap.total_hours || 0} total hours &bull; Target completion: <strong>{roadmap.job_ready_date || 'TBD'}</strong>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div id="mermaid-roadmap" className="flex justify-center overflow-x-auto py-4 min-h-[150px]" />
                  </CardContent>
                </Card>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monthly Plan with Courses</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {roadmap.monthly_plan.map((month) => (
                    <Card key={month.month} className="hover:border-violet-500/40 transition-colors">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shadow-violet-500/30">{month.month}</span>
                            <span className="text-xs font-semibold truncate max-w-[130px]">{month.title}</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0">{month.total_hours}h</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        {month.skills.map((skill, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold">{skill.skill}</span>
                              <Badge variant="outline" className={`text-[10px] ${getPriorityColor(skill.priority)}`}>{skill.priority}</Badge>
                            </div>
                            <div className="space-y-1">
                              {skill.courses.map((course, cidx) => (
                                <a key={cidx} href={course.url} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted border border-transparent hover:border-violet-500/20 transition-all text-xs group">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{course.name}</p>
                                    <p className="text-muted-foreground text-[10px]">{course.platform} · {course.duration}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                    {course.free && <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 px-1.5 py-0">Free</Badge>}
                                    <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-violet-500 transition-colors" />
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        ))}
                        <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">+{month.projected_score_improvement} projected score pts</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default GapAnalysis;
