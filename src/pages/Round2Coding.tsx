/**
 * Round2Coding — Proctored Coding Interview (One-time only)
 *
 * Rules:
 *  • 2 questions  (1 easy + 1 medium)
 *  • 25-minute countdown per question
 *  • Q1 must be SUBMITTED before moving to Q2 (locked until submitted)
 *  • Once Q2 starts, Q1 is permanently locked — no going back
 *  • Full proctoring: fullscreen, tab-switch, split-screen, TF.js face detection
 *  • User can only attend ONCE unless admin reschedules
 *  • No score/feedback shown on completion screen
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { CodeEditor } from '@/components/CodeEditor';
import { TestCaseResults } from '@/components/TestCaseResults';
import WebcamPanel from '@/components/WebcamPanel';
import ProctoringBanner from '@/components/ProctoringBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getRandomQuestionsByDifficulty } from '@/data/codingQuestions';
import { CodingQuestion, CodingSubmission, CodingSession, ProgrammingLanguage, CodeExecutionResult } from '@/types/coding';
import { executeCode, getCodeTemplate, estimateComplexity } from '@/utils/codeExecutionService';
import { analyzeCodePerformance } from '@/utils/codePerformanceAnalyzer';
import { savePracticeCodingResult } from '@/lib/firebaseService';
import { round2Api } from '@/lib/api';
import type { FaceViolation } from '@/hooks/useFaceDetection';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Trophy, ChevronRight, ChevronLeft, Send, Play, Loader2,
  Clock, Target, Maximize, Minimize, AlertTriangle,
  ShieldCheck, CheckCircle, Video, Lock, ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';

// ── Constants ────────────────────────────────────────────────────────────────
const TOTAL_QUESTIONS   = 2;
const MINS_PER_QUESTION = 25;
const SECS_PER_QUESTION = MINS_PER_QUESTION * 60;

const fmtTime = (secs: number) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ── Component ─────────────────────────────────────────────────────────────────
const Round2Coding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();

  const roleName = searchParams.get('roleName') || 'Software Engineer';

  // ── One-time check ──────────────────────────────────────────────────────────
  const [alreadyAttended, setAlreadyAttended] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  // ── Proctoring state ────────────────────────────────────────────────────────
  const [showRules, setShowRules]               = useState(true);
  const [isFullScreen, setIsFullScreen]         = useState(false);
  const [showAbortDialog, setShowAbortDialog]   = useState(false);
  const [abortReason, setAbortReason]           = useState('');
  const [bannerViolation, setBannerViolation]   = useState<FaceViolation | null>(null);
  const [bannerStrikeCount, setBannerStrikeCount] = useState(0);
  const testActive = useRef(true);

  // ── Q1 lock / Q2 confirm dialog ─────────────────────────────────────────────
  const [q1Submitted, setQ1Submitted]           = useState(false);   // Q1 locked after submit
  const [q2Locked, setQ2Locked]                 = useState(true);    // Q2 is locked until Q1 submitted
  const [showQ2ConfirmDialog, setShowQ2ConfirmDialog] = useState(false);

  // ── Question / code state ───────────────────────────────────────────────────
  const [questions, setQuestions]               = useState<CodingQuestion[]>([]);
  const [currentIdx, setCurrentIdx]             = useState(0);
  const [currentQuestion, setCurrentQuestion]   = useState<CodingQuestion | null>(null);
  const [code, setCode]                         = useState('');
  const [language, setLanguage]                 = useState<ProgrammingLanguage>('javascript');
  const [isRunning, setIsRunning]               = useState(false);
  const [isSubmitting, setIsSubmitting]         = useState(false);
  const [executionResult, setExecutionResult]   = useState<CodeExecutionResult | null>(null);
  const [submissions, setSubmissions]           = useState<CodingSubmission[]>([]);
  const [attemptCount, setAttemptCount]         = useState(0);
  const [sessionStart]                          = useState(new Date().toISOString());
  const [showCompletion, setShowCompletion]     = useState(false);
  const [isSaving, setIsSaving]                 = useState(false);

  // ── Per-question timer ─────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft]                 = useState(SECS_PER_QUESTION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Check if already attended ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    round2Api.getMyResult()
      .then(data => {
        if (data?.result) setAlreadyAttended(true);
      })
      .catch(() => {})
      .finally(() => setCheckingEligibility(false));
  }, [user]);

  // ── Load questions ──────────────────────────────────────────────────────────
  useEffect(() => {
    const qs = getRandomQuestionsByDifficulty(1, 1, 0);
    setQuestions(qs);
    if (qs.length > 0) {
      setCurrentQuestion(qs[0]);
      setCode(getCodeTemplate('javascript', qs[0]));
    }
  }, []);

  // ── Start/reset timer on question change ───────────────────────────────────
  useEffect(() => {
    if (showRules || showCompletion) return;
    setTimeLeft(SECS_PER_QUESTION);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, showRules, showCompletion]);

  // ── Reset code when language or question changes ───────────────────────────
  useEffect(() => {
    if (currentQuestion) {
      setCode(getCodeTemplate(language, currentQuestion));
      setExecutionResult(null);
    }
  }, [language, currentQuestion]);

  // ── PROCTORING: Tab-switch / blur / resize ─────────────────────────────────
  useEffect(() => {
    if (showRules || showCompletion) return;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && testActive.current) {
        testActive.current = false;
        setAbortReason('Tab switching detected during Round 2 coding interview.');
        setShowAbortDialog(true);
      }
    };
    const onBlur = () => {
      if (!document.hasFocus() && testActive.current) {
        testActive.current = false;
        setAbortReason('Window focus lost — possible split-screen detected.');
        setShowAbortDialog(true);
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; return ''; };
    let lastW = window.innerWidth, lastH = window.innerHeight;
    const onResize = () => {
      const dw = Math.abs(window.innerWidth - lastW);
      const dh = Math.abs(window.innerHeight - lastH);
      if ((dw > 200 || dh > 200) && testActive.current) {
        testActive.current = false;
        setAbortReason('Split-screen / window resize detected.');
        setShowAbortDialog(true);
      }
      lastW = window.innerWidth; lastH = window.innerHeight;
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('resize', onResize);
    };
  }, [showRules, showCompletion]);

  // ── Fullscreen ─────────────────────────────────────────────────────────────
  const requestFullScreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {
      toast({ title: 'Fullscreen unavailable', description: 'Press F11 for fullscreen.' });
    });
  };
  const exitFullScreen = () => { if (document.fullscreenElement) document.exitFullscreen(); };
  const toggleFullScreen = () => document.fullscreenElement ? exitFullScreen() : requestFullScreen();

  useEffect(() => {
    const handler = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if ((showCompletion || showAbortDialog) && document.fullscreenElement) exitFullScreen();
  }, [showCompletion, showAbortDialog]);

  // ── Face proctoring ────────────────────────────────────────────────────────
  const handleFaceWarning = useCallback((violation: FaceViolation) => {
    setBannerStrikeCount(1);
    setBannerViolation(violation);
    const desc =
      violation.type === 'multiple_faces'     ? 'Multiple faces detected. Next violation aborts!'
      : violation.type === 'prohibited_object' ? 'Prohibited object detected! Remove it.'
      : 'No face detected — stay in frame.';
    toast({ title: '⚠️ Proctoring Warning (Strike 1/2)', description: desc, variant: 'destructive' });
  }, [toast]);

  const handleFaceViolation = useCallback((violation: FaceViolation) => {
    if (!testActive.current) return;
    testActive.current = false;
    setBannerStrikeCount(2);
    setBannerViolation(violation);
    const reason =
      violation.type === 'multiple_faces'     ? 'Strike 2: Another person detected.'
      : violation.type === 'prohibited_object' ? 'Strike 2: Prohibited object again.'
      : 'Strike 2: No face detected for too long.';
    setAbortReason(reason + ' Test aborted.');
    setShowAbortDialog(true);
  }, []);

  // ── Rules accept ───────────────────────────────────────────────────────────
  const handleAcceptRules = () => {
    setShowRules(false);
    testActive.current = true;
    requestFullScreen();
    toast({ title: '🚀 Round 2 Started', description: 'Proctoring active. Do not switch tabs.' });
  };

  // ── Abort ──────────────────────────────────────────────────────────────────
  const handleAbort = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowAbortDialog(false);
    navigate('/dashboard');
    toast({ title: 'Interview Aborted', description: abortReason, variant: 'destructive' });
  };

  // ── Timer expires ──────────────────────────────────────────────────────────
  const handleTimeUp = () => {
    toast({ title: "⏰ Time's Up!", description: 'Moving to next automatically.', variant: 'destructive' });
    if (currentIdx === 0) {
      // If Q1 time's up without submit, force-lock Q1 and move to Q2
      setQ1Submitted(true);
      setQ2Locked(false);
      moveToQuestion(1);
    } else {
      finishSession();
    }
  };

  // ── Navigate to question ────────────────────────────────────────────────────
  // Shows confirm dialog when trying to move from Q1→Q2 for first time
  const requestMoveToQ2 = () => {
    if (!q1Submitted) {
      toast({ title: 'Submit Q1 first', description: 'You must submit Question 1 before moving to Question 2.', variant: 'destructive' });
      return;
    }
    setShowQ2ConfirmDialog(true);
  };

  const moveToQuestion = (idx: number) => {
    if (idx < 0 || idx >= questions.length) return;
    setCurrentIdx(idx);
    setCurrentQuestion(questions[idx]);
    setExecutionResult(null);
    setAttemptCount(0);
    setCode(getCodeTemplate(language, questions[idx]));
    if (idx === 1) {
      setQ2Locked(false);
    }
  };

  const confirmMoveToQ2 = () => {
    setShowQ2ConfirmDialog(false);
    moveToQuestion(1);
  };

  // ── Run (visible test cases) ───────────────────────────────────────────────
  const handleRun = async () => {
    if (!currentQuestion) return;
    setIsRunning(true); setExecutionResult(null); setAttemptCount(prev => prev + 1);
    try {
      toast({ title: 'Running Code...', description: 'Testing against sample test cases' });
      const result = await executeCode(code, currentQuestion, language, false);
      setExecutionResult(result);
      if (result.success) {
        toast({ title: '✅ Sample Tests Passed', description: 'Try submitting to run all tests.' });
      } else {
        toast({ title: '⚠️ Some Tests Failed', description: 'Check results below.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Execution Error', description: err.message, variant: 'destructive' });
    } finally { setIsRunning(false); }
  };

  // ── Submit (all test cases) ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!currentQuestion) return;
    setIsSubmitting(true); setExecutionResult(null);
    try {
      toast({ title: 'Submitting...', description: 'Running all test cases including hidden ones' });
      const result = await executeCode(code, currentQuestion, language, true);
      setExecutionResult(result);

      const passedTests = result.testResults?.filter(t => t.passed).length || 0;
      const totalTests  = result.testResults?.length || 0;
      const perf        = analyzeCodePerformance(code, language, currentQuestion);
      const correctness = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
      const overallScore = Math.round(
        (correctness * 0.5 + perf.efficiency * 0.25 + perf.codeQuality * 0.25)
      );

      const sub: CodingSubmission = {
        questionId:    currentQuestion.id,
        questionTitle: currentQuestion.title,
        code, language,
        passed:        result.success,
        passedTests, totalTests,
        executionTime: result.executionTime,
        memoryUsed:    result.memoryUsed,
        attempts:      attemptCount,
        hintsUsed:     0,
        timestamp:     new Date().toISOString(),
        feedback: {
          correctness,
          efficiency:      perf.efficiency,
          codeQuality:     perf.codeQuality,
          overallScore,
          suggestions:     perf.suggestions,
          strengths:       perf.strengths,
          timeComplexity:  perf.timeComplexity,
          spaceComplexity: perf.spaceComplexity,
        },
      };

      setSubmissions(prev => [...prev.filter(s => s.questionId !== currentQuestion.id), sub]);

      if (currentIdx === 0) {
        // Q1 submitted — unlock Q2
        setQ1Submitted(true);
        toast({
          title: result.success ? '✅ Q1 Submitted!' : '📝 Q1 Submitted',
          description: result.success
            ? 'All tests passed! Click "Next →" to proceed to Question 2.'
            : `${passedTests}/${totalTests} tests passed. You can still proceed to Q2.`,
        });
      } else {
        toast({
          title: result.success ? '🎉 Q2 Submitted!' : '📝 Q2 Submitted',
          description: result.success
            ? 'All tests passed!'
            : `${passedTests}/${totalTests} tests passed.`,
        });
        // Auto-finish after Q2 submit
        setTimeout(() => finishSession(), 2000);
      }
    } catch (err: any) {
      toast({ title: 'Submit Error', description: err.message, variant: 'destructive' });
    } finally { setIsSubmitting(false); }
  };

  // ── Finish session ─────────────────────────────────────────────────────────
  const finishSession = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!user) { setShowCompletion(true); return; }
    setIsSaving(true);

    const problemsSolved = submissions.filter(s => s.passed).length;
    const avgScore = submissions.reduce((sum, s) => sum + s.feedback.overallScore, 0) / (submissions.length || 1);
    const timeSpent = Math.floor((Date.now() - new Date(sessionStart).getTime()) / 60000);

    const weakAreas: string[] = [];
    const strongAreas: string[] = [];
    submissions.forEach(sub => {
      const q = questions.find(q => q.id === sub.questionId);
      if (q) {
        if (!sub.passed) weakAreas.push(q.category);
        else if (sub.feedback.overallScore >= 80) strongAreas.push(q.category);
      }
    });

    try {
      // Save to practice_coding (existing system)
      const session: CodingSession = {
        id:             `round2-${Date.now()}`,
        userId:         user.id,
        userEmail:      user.email,
        date:           new Date().toISOString(),
        startTime:      sessionStart,
        endTime:        new Date().toISOString(),
        problemsSolved,
        totalProblems:  questions.length,
        score:          Math.round(avgScore),
        timeSpent,
        submissions,
        weakAreas:      [...new Set(weakAreas)],
        strongAreas:    [...new Set(strongAreas)],
        completed:      true,
      };
      await savePracticeCodingResult(session, user.id);

      // Save to round2_coding table (enforcement + admin view)
      await round2Api.save({
        roleName,
        score:          Math.round(avgScore),
        problemsSolved,
        totalProblems:  questions.length,
        timeSpent,
        submissions,
        completedAt:    new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn('Round 2 save warning:', err.message);
    } finally {
      setIsSaving(false);
    }
    setShowCompletion(true);
  };

  // ── Timer colour ───────────────────────────────────────────────────────────
  const timerColour = timeLeft > 300 ? 'text-green-400' : timeLeft > 60 ? 'text-amber-400' : 'text-red-400 animate-pulse';

  // ── Already attended screen ────────────────────────────────────────────────
  if (checkingEligibility) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-10 w-10 animate-spin text-violet-500" />
        </div>
      </Layout>
    );
  }

  if (alreadyAttended) {
    return (
      <Layout>
        <div className="container max-w-xl mx-auto px-4 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-2 border-amber-500/30 bg-amber-500/5">
              <CardContent className="pt-10 pb-10 text-center space-y-5">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Lock className="h-8 w-8 text-amber-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Round 2 Already Completed</h1>
                  <p className="text-muted-foreground mt-2 text-sm">
                    You have already attended Round 2 of the coding interview.<br />
                    Each candidate can only attempt Round 2 once.
                  </p>
                </div>
                <div className="bg-muted/40 rounded-xl p-4 text-sm text-muted-foreground">
                  <p>If you believe this is an error or wish to reattempt,</p>
                  <p className="font-medium mt-1">please contact the admin to reschedule.</p>
                </div>
                <Button variant="outline" onClick={() => navigate('/dashboard')}>
                  Back to Dashboard
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // ── Rules screen ───────────────────────────────────────────────────────────
  if (showRules) {
    return (
      <Layout>
        <div className="container max-w-2xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-600/5">
              <CardContent className="pt-8 pb-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                    <ShieldCheck className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-bold">Round 2 — Coding Interview</h1>
                  <p className="text-muted-foreground text-sm">{roleName} · Proctored · One attempt only</p>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    ['🎯', 'You will solve 2 coding problems — one easy, one medium.'],
                    ['⏱️', '25 minutes per question. Timer auto-advances when time runs out.'],
                    ['🔒', 'You must SUBMIT Question 1 before you can move to Question 2. Once you move, Q1 is permanently locked.'],
                    ['📷', 'Camera monitored via AI face detection (TensorFlow.js).'],
                    ['🖥️', 'Must stay in fullscreen. Tab-switching or split-screen will abort the interview.'],
                    ['🚫', 'No phones, books, or additional screens allowed in camera frame.'],
                    ['⚠️', 'This is a ONE-TIME attempt. You cannot retake Round 2 without admin approval.'],
                    ['✅', 'You can run code against sample test cases before submitting.'],
                  ].map(([icon, text], i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg">
                      <span className="text-lg shrink-0">{icon}</span>
                      <span className="text-muted-foreground">{text}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>Cancel</Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30"
                    onClick={handleAcceptRules}
                  >
                    <Video className="h-4 w-4 mr-2" />Accept & Start Interview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // ── Completion screen (NO feedback/scores shown) ────────────────────────────
  if (showCompletion) {
    return (
      <Layout>
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-purple-600/5">
              <CardContent className="pt-12 pb-12 text-center space-y-6">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Round 2 Submitted!</h1>
                  <p className="text-muted-foreground mt-2">{roleName} · Coding Interview</p>
                </div>
                <div className="bg-muted/40 rounded-xl p-6 space-y-3 text-sm text-muted-foreground">
                  <p className="text-base font-medium text-foreground">Your responses have been recorded.</p>
                  <p>Results will be reviewed by the admin team.</p>
                  <p>If you are selected for Round 3 (AI Bot Interview), you will receive an email notification.</p>
                </div>
                <div className="flex gap-3 justify-center pt-2">
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>Dashboard</Button>
                  <Button
                    onClick={() => navigate('/profile')}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 text-white"
                  >
                    View Profile <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (questions.length === 0 || !currentQuestion) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-violet-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading Round 2 problems…</p>
          </div>
        </div>
      </Layout>
    );
  }

  const currentQ1Submitted = q1Submitted;
  const isOnQ2 = currentIdx === 1;
  const isOnQ1 = currentIdx === 0;

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <Layout>
      {/* Abort dialog */}
      <AlertDialog open={showAbortDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Interview Terminated
            </AlertDialogTitle>
            <AlertDialogDescription>
              {abortReason || 'A proctoring violation was detected. Your interview has been terminated.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleAbort} className="bg-red-600 text-white hover:bg-red-700">
              OK — Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Q1→Q2 confirmation dialog */}
      <AlertDialog open={showQ2ConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" /> Move to Question 2?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Once you proceed to Question 2, <strong>Question 1 will be permanently locked and submitted</strong>.
              You cannot go back to Question 1. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowQ2ConfirmDialog(false)}>
              Stay on Q1
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmMoveToQ2} className="bg-violet-600 text-white hover:bg-violet-700">
              Yes, Move to Q2 →
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Proctoring banner */}
      {bannerViolation && (
        <ProctoringBanner violation={bannerViolation} strikeCount={bannerStrikeCount} />
      )}

      <div className="flex h-[calc(100vh-64px)] bg-background flex-col">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-card/90 backdrop-blur-sm shrink-0">
          {/* Left: Badge + role + Q nav */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
              Round 2
            </div>
            <div>
              <p className="font-semibold text-sm">{roleName}</p>
              <p className="text-xs text-muted-foreground">Problem {currentIdx + 1} of {questions.length}</p>
            </div>

            {/* Question nav dots with lock indicator */}
            <div className="flex items-center gap-1 ml-2">
              {questions.map((q, i) => {
                const sub = submissions.find(s => s.questionId === q.id);
                const isQ1Locked = i === 0 && isOnQ2;
                const isQ2Locked = i === 1 && q2Locked && !isOnQ2;
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      if (i === 0 && isOnQ2) return; // Q1 locked after Q2 starts
                      if (i === 1 && !q1Submitted) {
                        toast({ title: 'Submit Q1 first', description: 'Complete Q1 before proceeding.', variant: 'destructive' });
                        return;
                      }
                      if (i === 1 && q1Submitted && !isOnQ2) requestMoveToQ2();
                    }}
                    title={isQ1Locked ? 'Q1 locked' : isQ2Locked ? 'Submit Q1 first' : `Question ${i + 1}`}
                    className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-all
                      ${i === currentIdx
                        ? 'bg-violet-500 text-white shadow shadow-violet-500/40'
                        : sub?.passed
                          ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                          : sub
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : isQ1Locked || (isQ2Locked)
                              ? 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                  >
                    {(isQ1Locked || (i === 1 && !q1Submitted)) ? <Lock className="h-3 w-3" /> : i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center: Timer */}
          <div className="flex items-center gap-2">
            <Clock className={`h-4 w-4 ${timerColour}`} />
            <span className={`font-mono text-lg font-bold tabular-nums ${timerColour}`}>{fmtTime(timeLeft)}</span>
            <span className="text-xs text-muted-foreground">/ Q{currentIdx + 1}</span>
          </div>

          {/* Right: Fullscreen + Finish */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullScreen}
              className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
            >
              {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
            <Button
              size="sm"
              onClick={finishSession}
              disabled={submissions.length === 0 || isSaving}
              className="bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow"
            >
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trophy className="h-4 w-4 mr-1" />}
              {isSaving ? 'Saving...' : 'Finish Interview'}
            </Button>
          </div>
        </div>

        {/* ── Split pane ───────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: Problem description */}
          <div className="w-1/2 bg-background border-r border-border flex flex-col">
            <div className="p-4 border-b border-border bg-muted/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Round 2</span><span>›</span>
                <span>Coding Interview</span><span>›</span>
                <span>{roleName}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-3">{currentQuestion.title}</h1>
                <div className="flex gap-2 mb-4">
                  <Badge
                    className={
                      currentQuestion.difficulty === 'easy'
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-0'
                        : 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border-0'
                    }
                  >
                    {currentQuestion.difficulty.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{currentQuestion.category}</Badge>
                </div>
              </div>

              <div className="prose prose-gray dark:prose-invert max-w-none">
                <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{currentQuestion.description}</div>
              </div>

              {currentQuestion.examples.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Example</h3>
                  {currentQuestion.examples.map((ex, i) => (
                    <div key={i} className="bg-muted/50 rounded-lg p-4 border border-border">
                      <div className="space-y-3 text-sm">
                        <div><span className="font-medium">Input:</span><div className="bg-background p-3 rounded mt-2 border font-mono">{ex.input}</div></div>
                        <div><span className="font-medium">Output:</span><div className="bg-background p-3 rounded mt-2 border font-mono">{ex.output}</div></div>
                        {ex.explanation && <div><span className="font-medium">Explanation:</span><div className="text-muted-foreground mt-2">{ex.explanation}</div></div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold mb-3">Input Format</h3>
                <div className="bg-muted/50 rounded-lg p-4 border text-muted-foreground text-sm">{currentQuestion.inputFormat}</div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">Constraints</h3>
                <div className="bg-muted/50 rounded-lg p-4 border text-muted-foreground text-sm space-y-1">
                  {currentQuestion.constraints.map((c, i) => <div key={i} className="font-mono">• {c}</div>)}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">Output Format</h3>
                <div className="bg-muted/50 rounded-lg p-4 border text-muted-foreground text-sm">{currentQuestion.outputFormat}</div>
              </div>

              {/* Webcam panel */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Proctoring Active
                </p>
                <WebcamPanel proctoring objectDetection onViolation={handleFaceViolation} onWarning={handleFaceWarning} />
              </div>
            </div>
          </div>

          {/* Right: Code editor + results */}
          <div className="w-1/2 bg-background flex flex-col">
            <div className="flex-1 min-h-0">
              <CodeEditor
                code={code}
                language={language}
                onChange={setCode}
                onLanguageChange={setLanguage}
                onRun={handleRun}
                onSubmit={handleSubmit}
                onReset={() => {
                  if (currentQuestion) setCode(getCodeTemplate(language, currentQuestion));
                  setExecutionResult(null);
                  toast({ title: 'Code Reset', description: 'Starter code restored.' });
                }}
                isRunning={isRunning}
                height="100%"
              />
            </div>
            <div className="h-64 border-t border-border bg-gray-900 dark:bg-gray-950">
              <TestCaseResults result={executionResult} isRunning={isRunning} />
            </div>
          </div>
        </div>

        {/* ── Navigation footer ─────────────────────────────────────────────── */}
        <div className="bg-background border-t border-border px-6 py-3 shrink-0">
          <div className="flex items-center justify-between">
            {/* Previous — disabled on Q2 (Q1 is locked) */}
            <Button
              onClick={() => {}} // no-op; Q1 always locked once on Q2
              disabled={isOnQ1 || isOnQ2} // always disabled
              variant="outline" size="sm" className="gap-2"
            >
              <Lock className="h-4 w-4" /> Q1 Locked
            </Button>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Problem {currentIdx + 1} of {questions.length}</span>
              <span className="text-xs">·</span>
              <span className={`font-mono font-semibold ${timerColour}`}>{fmtTime(timeLeft)} left</span>
            </div>

            {/* Next / Finish */}
            {isOnQ1 ? (
              <Button
                onClick={requestMoveToQ2}
                disabled={!q1Submitted}
                variant="outline" size="sm" className="gap-2"
                title={!q1Submitted ? 'Submit Q1 first to proceed' : 'Move to Question 2'}
              >
                {!q1Submitted ? <Lock className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                {!q1Submitted ? 'Submit Q1 to proceed' : 'Next →'}
              </Button>
            ) : (
              <Button
                onClick={finishSession}
                disabled={isSaving}
                size="sm"
                className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                Finish Interview
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Round2Coding;
