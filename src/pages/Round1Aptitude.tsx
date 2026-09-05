import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import WebcamPanel from '@/components/WebcamPanel';
import ProctoringBanner from '@/components/ProctoringBanner';
import InterviewRules from '@/components/InterviewRules';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { saveRound1AptitudeResult } from '@/lib/firebaseService';
import { logActivity } from '@/utils/profileService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getBalancedQuestionSet, MCQQuestion } from '@/data/aptitudeQuestions';
import { Brain, Clock, AlertCircle, CheckCircle, Home, ArrowRight, Send, Video, Maximize, Minimize } from 'lucide-react';
import type { FaceViolation } from '@/hooks/useFaceDetection';
import { motion } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Round1Aptitude = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRules, setShowRules] = useState(true);
  const [showAbortDialog, setShowAbortDialog] = useState(false);
  const [abortReason, setAbortReason] = useState<string>('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [bannerViolation, setBannerViolation] = useState<FaceViolation | null>(null);
  const [bannerStrikeCount, setBannerStrikeCount] = useState(0);
  const testActive = useRef(true);

  // Get role info from location state
  const roleId = location.state?.roleId;
  const roleName = location.state?.roleName;

  useEffect(() => {
    if (!roleId || !roleName) {
      toast({
        title: "Error",
        description: "Role information missing. Redirecting to home.",
        variant: "destructive",
      });
      navigate('/home');
      return;
    }

    // Generate 25 random questions for formal aptitude test
    const randomQuestions = getBalancedQuestionSet(25);
    setQuestions(randomQuestions);
    setUserAnswers(new Array(25).fill(null));
  }, [roleId, roleName, navigate, toast]);

  // ==================== PROCTORING: Tab-switch, blur, resize, beforeunload ====================
  useEffect(() => {
    if (showRules || showResults) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && testActive.current && !showResults) {
        testActive.current = false;
        setShowAbortDialog(true);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!showResults) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    const handleFocusChange = () => {
      if (!document.hasFocus() && testActive.current && !showResults) {
        testActive.current = false;
        setShowAbortDialog(true);
      }
    };

    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;

    const handleResize = () => {
      const widthChange = Math.abs(window.innerWidth - lastWidth);
      const heightChange = Math.abs(window.innerHeight - lastHeight);

      if ((widthChange > 200 || heightChange > 200) && testActive.current && !showResults) {
        testActive.current = false;
        setShowAbortDialog(true);
      }

      lastWidth = window.innerWidth;
      lastHeight = window.innerHeight;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleFocusChange);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleFocusChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [showRules, showResults]);

  // ==================== FULLSCREEN MANAGEMENT ====================
  const requestFullScreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => {
        console.warn('Could not enter full-screen mode:', err);
        toast({
          title: "Full-screen Unavailable",
          description: "Please manually enter full-screen mode (F11) for the best experience.",
          variant: "default",
        });
      });
    }
  };

  const exitFullScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      requestFullScreen();
    } else {
      exitFullScreen();
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Exit fullscreen when results shown or aborted
  useEffect(() => {
    if ((showResults || showAbortDialog) && document.fullscreenElement) {
      exitFullScreen();
    }
  }, [showResults, showAbortDialog]);

  // ==================== RULES & ABORT HANDLERS ====================
  const handleAcceptRules = () => {
    setShowRules(false);
    testActive.current = true;
    requestFullScreen();
    toast({
      title: "Test Started",
      description: "You've accepted the rules. Your aptitude test has now begun. Do NOT switch tabs.",
    });
  };

  const handleCancelRules = () => {
    navigate('/home');
  };

  const handleAbortTest = () => {
    // Save aborted result to Firestore so it shows in history & admin
    if (user) {
      const score = calculateScore();
      const categoryPerf = getCategoryPerformance();
      saveRound1AptitudeResult(
        {
          userId: user.id,
          userEmail: user.email || '',
          userName: user.name,
          roleId: roleId!,
          roleName: roleName!,
          score: score.percentage,
          totalQuestions: score.total,
          correctAnswers: score.correct,
          categoryPerformance: categoryPerf,
          completedAt: new Date().toISOString(),
          aborted: true,
          abortReason: abortReason || 'Tab-switching, split-screen, or leaving the test window',
        },
        user.id
      ).catch(err => console.error('Failed to save aborted result:', err));
    }
    setShowAbortDialog(false);
    navigate('/home');
    toast({
      title: "Test Aborted",
      description: abortReason || "Your aptitude test was aborted due to tab-switching, split-screen, or leaving the test window.",
      variant: "destructive",
    });
  };

  // Handle face proctoring — 1st strike = warning toast + banner
  const handleFaceWarning = useCallback((violation: FaceViolation) => {
    setBannerStrikeCount(1);
    setBannerViolation(violation);
    const desc =
      violation.type === 'multiple_faces'
        ? 'Multiple faces detected in your camera. Next violation will abort the test!'
        : violation.type === 'prohibited_object'
        ? 'Prohibited object (phone/book) detected! Remove it immediately. Next violation will abort!'
        : 'No face detected for too long. Please stay in frame. Next violation will abort!';
    toast({
      title: "⚠️ Proctoring Warning (Strike 1/2)",
      description: desc,
      variant: "destructive",
    });
  }, [toast]);

  // Handle face proctoring — 2nd strike = abort + banner
  const handleFaceViolation = useCallback((violation: FaceViolation) => {
    if (!testActive.current) return;
    testActive.current = false;
    setBannerStrikeCount(2);
    setBannerViolation(violation);
    const reason =
      violation.type === 'multiple_faces'
        ? 'Strike 2: Another person detected in frame again. Test aborted.'
        : violation.type === 'prohibited_object'
        ? 'Strike 2: Prohibited object detected again. Test aborted.'
        : 'Strike 2: Face not detected for too long again. Test aborted.';
    setAbortReason(reason);
    setShowAbortDialog(true);
  }, []);

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Show results
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((question, index) => {
      if (userAnswers[index] === question.correctAnswer) {
        correct++;
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100),
    };
  };

  const getCategoryPerformance = () => {
    const categoryStats: Record<string, { correct: number; total: number; percentage: number }> = {};
    
    questions.forEach((question, index) => {
      const category = question.category;
      if (!categoryStats[category]) {
        categoryStats[category] = { correct: 0, total: 0, percentage: 0 };
      }
      categoryStats[category].total++;
      if (userAnswers[index] === question.correctAnswer) {
        categoryStats[category].correct++;
      }
    });

    // Calculate percentages
    Object.keys(categoryStats).forEach(category => {
      const stats = categoryStats[category];
      stats.percentage = Math.round((stats.correct / stats.total) * 100);
    });

    return categoryStats;
  };

  const handleSubmit = async () => {
    setSaving(true);

    // Save results to Firestore
    if (user) {
      try {
        console.log('Saving Round 1 aptitude results for user:', user.id);
        const score = calculateScore();
        const categoryPerf = getCategoryPerformance();

        const result = await saveRound1AptitudeResult(
          {
            userId: user.id,
            userEmail: user.email || '',
            userName: user.name,
            roleId: roleId!,
            roleName: roleName!,
            score: score.percentage,
            totalQuestions: score.total,
            correctAnswers: score.correct,
            categoryPerformance: categoryPerf,
            completedAt: new Date().toISOString(),
          },
          user.id
        );

        if (result.success) {
          setShowResults(true);
          toast({
            title: "Test Submitted Successfully!",
            description: "Your Round 1 aptitude test has been submitted for review.",
          });

          // Log to profile activity
          logActivity(
            'interview',
            'Round 1 Aptitude Completed',
            `Role: ${roleName}, Score: ${score.percentage}% (${score.correct}/${score.total})`,
            { roleId, roleName, score: score.percentage, correct: score.correct, total: score.total }
          ).catch(() => {});
        } else {
          throw new Error(result.error || 'Failed to save');
        }
      } catch (error) {
        console.error('Error saving Round 1 results:', error);
        toast({
          title: "Error",
          description: "Failed to save results. Please try again or contact support.",
          variant: "destructive",
        });
        setSaving(false);
      }
    } else {
      toast({
        title: "Error",
        description: "You must be logged in. Please login and try again.",
        variant: "destructive",
      });
      setSaving(false);
    }
  };

  const score = calculateScore();
  const categoryPerf = getCategoryPerformance();

  // Show rules first before test begins
  if (showRules) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto px-4 py-12">
          <InterviewRules onAccept={handleAcceptRules} onCancel={handleCancelRules} />
        </div>
      </Layout>
    );
  }

  if (showResults) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="bg-green-50 border-2 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  Test Submitted Successfully!
                </CardTitle>
                <CardDescription className="text-base">
                  {roleName} Position - Round 1 Aptitude Test
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-blue-50 border-blue-200">
                  <Send className="h-5 w-5 text-blue-600" />
                  <AlertTitle className="text-blue-600">Under Review</AlertTitle>
                  <AlertDescription>
                    Your Round 1 aptitude test has been submitted successfully and is now under admin review.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Results Under Review</h4>
                      <p className="text-sm text-muted-foreground">
                        Your test results are currently being evaluated by our admin team. Results will be available in your History page after review.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-green-500/10 p-2 rounded-full">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Selection Notification</h4>
                      <p className="text-sm text-muted-foreground">
                        If you're selected for Round 2 (Mock Interview), you'll receive an email notification with further instructions.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="bg-blue-500/10 p-2 rounded-full">
                      <ArrowRight className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Check Your History</h4>
                      <p className="text-sm text-muted-foreground">
                        Visit your History page to track the status of your application and view results after admin review.
                      </p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Important Information</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 mt-2">
                      <li>Check your email regularly for Round 2 invitation</li>
                      <li>Results will be visible in your History page after admin approval</li>
                      <li>If selected, you'll have access to start Round 2 (Mock Interview)</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <div className="flex gap-4 justify-center mt-8">
                  <Button
                    onClick={() => navigate('/history')}
                    variant="default"
                    className="gap-2"
                  >
                    View History
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => navigate('/home')} variant="outline" className="gap-2">
                    <Home className="h-4 w-4" />
                    Back to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-12">
        {/* Webcam panel positioned at top-right */}
        <div className="fixed top-4 right-4 w-64 h-48 z-50 border-2 border-border rounded-lg overflow-hidden bg-background shadow-lg">
          <div className="flex items-center justify-center p-2 bg-primary text-primary-foreground text-sm font-medium">
            <Video className="h-4 w-4 mr-2" />
            Monitoring Camera
          </div>
          <div className="h-40">
            <WebcamPanel onViolation={handleFaceViolation} onWarning={handleFaceWarning} />
          </div>
        </div>

        {/* Proctoring banner — full-width alert for violations */}
        <ProctoringBanner violation={bannerViolation} strikeCount={bannerStrikeCount} />

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center mb-4">
              <div>
                <CardTitle className="text-2xl">Round 1: Aptitude Test</CardTitle>
                <CardDescription className="text-base mt-1">
                  {roleName} Position - Formal Interview
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullScreen}
                  className="flex items-center gap-2"
                  title={isFullScreen ? 'Exit full-screen' : 'Enter full-screen'}
                >
                  {isFullScreen ? (
                    <><Minimize className="h-4 w-4" /> Exit Full-screen</>
                  ) : (
                    <><Maximize className="h-4 w-4" /> Full-screen</>
                  )}
                </Button>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  Question {currentQuestionIndex + 1} / {questions.length}
                </Badge>
              </div>
            </div>

            <Alert>
              <Brain className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                This is Round 1 of the formal interview process. Your performance will be evaluated by the admin.
                If selected, you'll proceed to Round 2 (Mock Interview). Camera monitoring is active during this test.
              </AlertDescription>
            </Alert>
          </CardHeader>

          <CardContent>
            {questions.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="capitalize">
                    {questions[currentQuestionIndex].category}
                  </Badge>
                  <Badge variant="secondary">
                    Difficulty: {questions[currentQuestionIndex].difficulty}
                  </Badge>
                </div>

                <div className="text-lg font-medium mb-6">
                  {questions[currentQuestionIndex].question}
                </div>

                <div className="space-y-3">
                  {questions[currentQuestionIndex].options.map((option, index) => (
                    <div
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        userAnswers[currentQuestionIndex] === index
                          ? 'border-mockmate-primary bg-mockmate-primary/10'
                          : 'border-gray-200 hover:border-mockmate-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          userAnswers[currentQuestionIndex] === index
                            ? 'border-mockmate-primary bg-mockmate-primary text-white'
                            : 'border-gray-300'
                        }`}>
                          {userAnswers[currentQuestionIndex] === index && '✓'}
                        </div>
                        <span>{option}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                variant="outline"
              >
                Previous
              </Button>

              <div className="flex gap-2">
                <span className="text-sm text-muted-foreground flex items-center">
                  {userAnswers.filter(a => a !== null).length} / {questions.length} answered
                </span>
              </div>

              <Button
                onClick={handleNext}
                disabled={userAnswers[currentQuestionIndex] === null}
              >
                {currentQuestionIndex === questions.length - 1 ? 'Submit' : 'Next'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Abort Dialog */}
      <AlertDialog open={showAbortDialog} onOpenChange={setShowAbortDialog}>
        <AlertDialogContent className="z-[9999] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-md border-2 border-red-500 shadow-2xl bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-red-600">Test Aborted</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {abortReason || 'Your aptitude test has been aborted because you switched tabs, used split-screen, or exited the test window. Please start again without switching tabs or windows during the test.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={handleAbortTest}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 text-base"
            >
              Return to Home
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Round1Aptitude;
