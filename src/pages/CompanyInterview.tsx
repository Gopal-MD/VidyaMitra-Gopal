import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2, Code2, Layers, Users, Cpu, Search,
  ChevronRight, RefreshCw, Sparkles, CheckCircle2,
  XCircle, Lightbulb, Target, Trophy, ArrowLeft,
  Clock, Star, AlertTriangle, BookOpen, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAuthToken } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────
interface Question {
  id: number;
  question: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  hint?: string;
}

interface Feedback {
  score: number;          // 1-10
  what_was_good: string;
  what_was_missing: string;
  model_answer: string;
  key_points: string[];
}

interface QuestionResult {
  question: Question;
  userAnswer: string;
  feedback: Feedback;
}

interface HistoryEntry {
  id: string;
  company: string;
  round: string;
  score: number;  // 0-100
  questions_count: number;
  created_at: string;
}

// ─── Round configs ─────────────────────────────────────────────────────────
const ROUNDS = [
  { id: 'DSA', label: 'DSA Round', icon: Code2, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Data Structures & Algorithms' },
  { id: 'SYSTEM_DESIGN', label: 'System Design', icon: Layers, color: 'text-violet-500', bg: 'bg-violet-500/10', desc: 'Architecture & Scalability' },
  { id: 'HR', label: 'HR / Behavioral', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Soft skills & Situational' },
  { id: 'TECHNICAL', label: 'Technical Round', icon: Cpu, color: 'text-orange-500', bg: 'bg-orange-500/10', desc: 'CS fundamentals & Projects' },
];

const POPULAR_COMPANIES = [
  'Google', 'Amazon', 'Microsoft', 'Meta', 'Apple',
  'Netflix', 'Adobe', 'Flipkart', 'Infosys', 'TCS',
  'Wipro', 'Zomato', 'Swiggy', 'Paytm', 'CRED',
  'PhonePe', 'Razorpay', 'Freshworks', 'Zoho', 'Ola',
];

// ─── Helper ────────────────────────────────────────────────────────────────
function getDifficultyColor(d: string) {
  if (d === 'Easy') return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30';
  if (d === 'Hard') return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30';
  return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
}

function getScoreColor(score: number) {
  if (score >= 8) return 'text-green-500';
  if (score >= 5) return 'text-amber-500';
  return 'text-red-500';
}

function getOverallBadge(avg: number) {
  if (avg >= 8) return { label: 'Excellent', color: 'bg-green-500/10 text-green-600 border-green-500/30' };
  if (avg >= 6) return { label: 'Good', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' };
  if (avg >= 4) return { label: 'Average', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' };
  return { label: 'Needs Practice', color: 'bg-red-500/10 text-red-600 border-red-500/30' };
}

// ─── Component ─────────────────────────────────────────────────────────────
const CompanyInterview = () => {
  // Phase: 'setup' | 'loading' | 'interview' | 'summary'
  const [phase, setPhase] = useState<'setup' | 'loading' | 'interview' | 'summary'>('setup');

  // Setup state
  const [company, setCompany] = useState('');
  const [selectedRound, setSelectedRound] = useState<string>('DSA');
  const [searchQuery, setSearchQuery] = useState('');

  // Interview state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<Feedback | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [error, setError] = useState('');
  const [setupTab, setSetupTab] = useState<'new' | 'history'>('new');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const currentQuestion = questions[currentIdx];
  const filteredCompanies = POPULAR_COMPANIES.filter(c =>
    searchQuery ? c.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  // ── Start Interview ──────────────────────────────────────────────────────
  const startInterview = async () => {
    if (!company.trim()) { setError('Please enter or select a company name.'); return; }
    setError('');
    setPhase('loading');

    try {
      const token = getAuthToken();
      const res = await fetch('/api/company-interview/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ company: company.trim(), round: selectedRound }),
      });

      if (!res.ok) throw new Error('Failed to generate questions');
      const data = await res.json();

      setQuestions(data.questions || []);
      setCurrentIdx(0);
      setResults([]);
      setCurrentFeedback(null);
      setUserAnswer('');
      setPhase('interview');
    } catch (_err) {
      setError('Could not generate questions. Please try again.');
      setPhase('setup');
    }
  };

  // ── Submit Answer ─────────────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!userAnswer.trim()) { setError('Please write your answer before submitting.'); return; }
    setError('');
    setEvaluating(true);

    try {
      const token = getAuthToken();
      const res = await fetch('/api/company-interview/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          company: company.trim(),
          round: selectedRound,
          question: currentQuestion.question,
          topic: currentQuestion.topic,
          answer: userAnswer.trim(),
        }),
      });

      if (!res.ok) throw new Error('Evaluation failed');
      const data = await res.json();
      setCurrentFeedback(data.feedback);
    } catch (_err) {
      setError('Evaluation failed. Showing default feedback.');
      setCurrentFeedback({
        score: 5,
        what_was_good: 'You attempted the question.',
        what_was_missing: 'Could not evaluate due to a network error.',
        model_answer: 'Please review this topic and try again.',
        key_points: ['Review the topic', 'Practice more examples'],
      });
    } finally {
      setEvaluating(false);
    }
  };

  // ── Next Question ─────────────────────────────────────────────────────────
  const nextQuestion = () => {
    if (!currentFeedback) return;

    const result: QuestionResult = {
      question: currentQuestion,
      userAnswer,
      feedback: currentFeedback,
    };
    const newResults = [...results, result];
    setResults(newResults);

    if (currentIdx + 1 >= questions.length) {
      const finalAvg = Math.round((newResults.reduce((s, r) => s + r.feedback.score, 0) / newResults.length) * 10);
      saveSession(newResults, finalAvg);
      setPhase('summary');
    } else {
      setCurrentIdx(prev => prev + 1);
      setUserAnswer('');
      setCurrentFeedback(null);
      setShowHint(false);
      setError('');
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setPhase('setup');
    setCompany('');
    setSearchQuery('');
    setSelectedRound('DSA');
    setQuestions([]);
    setCurrentIdx(0);
    setResults([]);
    setCurrentFeedback(null);
    setUserAnswer('');
    setError('');
  };

  // ── Load history ─────────────────────────────────────────────────────────
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch('/api/company-interview/history', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setHistory(data.history || []);
    } catch (_err) { /* fail silently */ }
    finally { setHistoryLoading(false); }
  };

  // ── Auto-save session ─────────────────────────────────────────────────────
  const saveSession = async (sessionResults: QuestionResult[], avgScoreVal: number) => {
    try {
      const token = getAuthToken();
      await fetch('/api/company-interview/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          company,
          round: selectedRound,
          score: avgScoreVal,
          questions_count: sessionResults.length,
          results: sessionResults,
        }),
      });
    } catch (_err) { /* fail silently — don't block UI */ }
  };

  const avgScore = results.length
    ? Math.round((results.reduce((s, r) => s + r.feedback.score, 0) / results.length) * 10)
    : 0;

  const roundConfig = ROUNDS.find(r => r.id === selectedRound)!;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Company Interview Simulator</h1>
            <p className="text-sm text-muted-foreground">AI-tailored mock interviews based on real company question patterns</p>
          </div>
        </div>

        {/* ═══ PHASE: SETUP ═══════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {phase === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-5">

              {/* Tab Switcher */}
              <div className="flex gap-1 bg-muted/50 border border-border/50 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setSetupTab('new')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    setupTab === 'new' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />New Interview
                </button>
                <button
                  onClick={() => { setSetupTab('history'); loadHistory(); }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    setupTab === 'history' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <History className="h-3.5 w-3.5" />Past Sessions
                </button>
              </div>

              {setupTab === 'new' ? (
                <>
              {error && (
                <Alert className="border-red-500/30 bg-red-500/5">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              {/* Company Selection */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    Select Company
                  </CardTitle>
                  <CardDescription>Type any company name or pick from popular ones below</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="e.g. Google, Amazon, Infosys..."
                      value={company}
                      onChange={(e) => { setCompany(e.target.value); setSearchQuery(e.target.value); }}
                    />
                  </div>

                  {/* Popular companies grid */}
                  <div className="flex flex-wrap gap-2">
                    {filteredCompanies.slice(0, 16).map(c => (
                      <button
                        key={c}
                        onClick={() => { setCompany(c); setSearchQuery(''); }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          company === c
                            ? 'bg-blue-500/15 border-blue-500/50 text-blue-600 dark:text-blue-400'
                            : 'bg-muted/50 border-border/50 text-muted-foreground hover:border-blue-500/30 hover:text-foreground'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Round Selection */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-violet-500" />
                    Select Interview Round
                  </CardTitle>
                  <CardDescription>Each round has 5 targeted questions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ROUNDS.map(round => (
                      <button
                        key={round.id}
                        onClick={() => setSelectedRound(round.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedRound === round.id
                            ? `${round.bg} border-current ${round.color}`
                            : 'bg-muted/30 border-border/50 hover:border-border text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <round.icon className={`h-5 w-5 mb-2 ${selectedRound === round.id ? round.color : ''}`} />
                        <div className="text-xs font-semibold leading-tight">{round.label}</div>
                        <div className="text-[10px] mt-0.5 opacity-70">{round.desc}</div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Start Button */}
              <Button
                onClick={startInterview}
                disabled={!company.trim()}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0"
              >
                <Sparkles className="h-5 w-5 mr-2" />
                {company.trim() ? `Start ${roundConfig.label} at ${company}` : 'Enter a company to start'}
              </Button>

              {/* Info row */}
              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> 5 questions per session</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~15–20 min</span>
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" /> AI-scored answers</span>
              </div>
                </>
              ) : (
                /* ── Past Sessions Tab ── */
                <div className="space-y-3">
                  {historyLoading ? (
                    <div className="flex items-center justify-center gap-2 py-14 text-muted-foreground">
                      <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
                      <span className="text-sm">Loading history...</span>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-14 text-muted-foreground space-y-2">
                      <History className="h-10 w-10 mx-auto opacity-20" />
                      <p className="font-medium text-sm">No sessions yet</p>
                      <p className="text-xs">Complete your first interview to see your history here.</p>
                    </div>
                  ) : (
                    history.map((h, idx) => {
                      const rc = ROUNDS.find(r => r.id === h.round);
                      const badge = getOverallBadge(h.score / 10);
                      return (
                        <div key={h.id || idx} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-blue-500/20 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                              {rc ? <rc.icon className={`h-4 w-4 ${rc.color}`} /> : <Building2 className="h-4 w-4 text-blue-500" />}
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{h.company}</div>
                              <div className="text-xs text-muted-foreground">
                                {rc?.label || h.round} · {new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <Badge variant="outline" className={`text-xs ${badge.color}`}>{badge.label}</Badge>
                            <span className={`text-lg font-bold ${getScoreColor(h.score / 10)}`}>
                              {h.score}<span className="text-xs text-muted-foreground font-normal">/100</span>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ PHASE: LOADING ══════════════════════════════════════════════ */}
          {phase === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center animate-pulse">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold">Generating {company} Interview Questions</p>
                <p className="text-sm text-muted-foreground">AI is crafting {roundConfig.label} questions tailored to {company}...</p>
              </div>
              <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
            </motion.div>
          )}

          {/* ═══ PHASE: INTERVIEW ════════════════════════════════════════════ */}
          {phase === 'interview' && currentQuestion && (
            <motion.div key="interview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="space-y-4">

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Question {currentIdx + 1} of {questions.length}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${roundConfig.color} border-current bg-current/10`}>
                      <roundConfig.icon className="h-3 w-3 mr-1" />{roundConfig.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{company}</Badge>
                  </div>
                </div>
                <Progress value={((currentIdx) / questions.length) * 100} className="h-1.5" />
              </div>

              {error && (
                <Alert className="border-amber-500/30 bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <AlertDescription className="text-amber-400 text-sm">{error}</AlertDescription>
                </Alert>
              )}

              {/* Question Card */}
              <Card className="border-blue-500/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs bg-muted/50">{currentQuestion.topic}</Badge>
                    <Badge variant="outline" className={`text-xs ${getDifficultyColor(currentQuestion.difficulty)}`}>
                      {currentQuestion.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-base leading-relaxed font-medium">{currentQuestion.question}</p>

                  {/* Hint toggle */}
                  {currentQuestion.hint && !currentFeedback && (
                    <button
                      onClick={() => setShowHint(p => !p)}
                      className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
                    >
                      <Lightbulb className="h-3.5 w-3.5" />
                      {showHint ? 'Hide hint' : 'Show hint'}
                    </button>
                  )}
                  {showHint && currentQuestion.hint && (
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
                      💡 {currentQuestion.hint}
                    </div>
                  )}

                  {/* Answer textarea */}
                  {!currentFeedback && (
                    <div className="space-y-3">
                      <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type your answer here... Be as detailed as possible."
                        className="w-full min-h-[160px] p-3 rounded-lg bg-muted/30 border border-border/50 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 text-sm resize-y transition-colors"
                        disabled={evaluating}
                      />
                      <Button
                        onClick={submitAnswer}
                        disabled={evaluating || !userAnswer.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0"
                      >
                        {evaluating ? (
                          <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Evaluating your answer...</>
                        ) : (
                          <><CheckCircle2 className="h-4 w-4 mr-2" />Submit Answer</>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Feedback Card */}
              <AnimatePresence>
                {currentFeedback && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className={`border-2 ${currentFeedback.score >= 7 ? 'border-green-500/30' : currentFeedback.score >= 4 ? 'border-amber-500/30' : 'border-red-500/30'}`}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-violet-400" />
                            AI Feedback
                          </span>
                          <span className={`text-2xl font-bold ${getScoreColor(currentFeedback.score)}`}>
                            {currentFeedback.score}<span className="text-sm text-muted-foreground font-normal">/10</span>
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Good / Missing */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-500 mb-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5" /> What was good
                            </div>
                            <p className="text-sm">{currentFeedback.what_was_good}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-red-500 mb-1.5">
                              <XCircle className="h-3.5 w-3.5" /> What was missing
                            </div>
                            <p className="text-sm">{currentFeedback.what_was_missing}</p>
                          </div>
                        </div>

                        {/* Key Points */}
                        {currentFeedback.key_points.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-xs font-semibold text-violet-500 flex items-center gap-1.5">
                              <Star className="h-3.5 w-3.5" /> Key points to remember
                            </div>
                            <ul className="space-y-1">
                              {currentFeedback.key_points.map((kp, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                  <ChevronRight className="h-3 w-3 mt-0.5 text-violet-400 shrink-0" />
                                  {kp}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Model Answer */}
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/50">
                          <div className="text-xs font-semibold text-muted-foreground mb-1.5">Model Answer</div>
                          <p className="text-sm leading-relaxed">{currentFeedback.model_answer}</p>
                        </div>

                        {/* Next button */}
                        <Button
                          onClick={nextQuestion}
                          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0"
                        >
                          {currentIdx + 1 >= questions.length ? (
                            <><Trophy className="h-4 w-4 mr-2" />View Results</>
                          ) : (
                            <>Next Question <ChevronRight className="h-4 w-4 ml-1" /></>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ═══ PHASE: SUMMARY ══════════════════════════════════════════════ */}
          {phase === 'summary' && (
            <motion.div key="summary" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

              {/* Hero score */}
              <Card className="border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
                <CardContent className="pt-8 pb-6 text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-500 mb-2">
                    <Building2 className="h-3 w-3" /> {company} — {roundConfig.label}
                  </div>
                  {/* Score circle */}
                  <div className="flex justify-center">
                    <div className="relative w-32 h-32">
                      <svg viewBox="0 0 100 100" className="transform -rotate-90">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(100,116,139,0.2)" strokeWidth="8" />
                        <motion.circle
                          cx="50" cy="50" r="45" fill="none"
                          stroke="url(#ci-gradient)" strokeWidth="8" strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 45}`}
                          initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                          animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - avgScore / 100) }}
                          transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                        <defs>
                          <linearGradient id="ci-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.span className="text-3xl font-bold"
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
                          {avgScore}
                        </motion.span>
                        <span className="text-xs text-muted-foreground">/ 100</span>
                      </div>
                    </div>
                  </div>

                  {/* Badge */}
                  {(() => {
                    const badge = getOverallBadge(results.reduce((s, r) => s + r.feedback.score, 0) / results.length);
                    return (
                      <Badge variant="outline" className={`text-sm px-4 py-1 ${badge.color}`}>
                        <Trophy className="h-3.5 w-3.5 mr-1.5" />{badge.label}
                      </Badge>
                    );
                  })()}
                  <p className="text-sm text-muted-foreground">
                    You answered {results.length} questions · Average score: {(results.reduce((s, r) => s + r.feedback.score, 0) / results.length).toFixed(1)}/10
                  </p>
                </CardContent>
              </Card>

              {/* Per-question breakdown */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Question-by-Question Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {results.map((r, i) => (
                    <div key={i} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-sm font-medium leading-snug">{r.question.question}</p>
                        </div>
                        <span className={`text-lg font-bold shrink-0 ${getScoreColor(r.feedback.score)}`}>
                          {r.feedback.score}/10
                        </span>
                      </div>
                      <div className="pl-7 space-y-1">
                        <p className="text-xs text-green-600 dark:text-green-400">✓ {r.feedback.what_was_good}</p>
                        <p className="text-xs text-red-500">✗ {r.feedback.what_was_missing}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Action buttons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    setPhase('setup');
                    setCompany(company);
                    setQuestions([]);
                    setResults([]);
                    setCurrentIdx(0);
                    setCurrentFeedback(null);
                    setUserAnswer('');
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Retry Same Company
                </Button>
                <Button
                  className="h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0"
                  onClick={reset}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Try Different Company
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};

export default CompanyInterview;
