
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import WebcamPanel, { type WebcamPanelHandle } from "@/components/WebcamPanel";
import ProctoringBanner from "@/components/ProctoringBanner";
import { useInterview } from "@/contexts/InterviewContext";
import InterviewProgress from "@/components/InterviewProgress";
import QuestionDisplay from "@/components/QuestionDisplay";
import AnswerInput from "@/components/AnswerInput";
import FeedbackDisplay from "@/components/FeedbackDisplay";
import QuestionTimer from "@/components/QuestionTimer";
import InterviewRules from "@/components/InterviewRules";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, CheckCircle, Maximize, Minimize, Video } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import type { FaceViolation } from "@/hooks/useFaceDetection";
import { useBehaviorProctor } from "@/hooks/useBehaviorProctor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Interview = () => {
  const { 
    currentInterview, 
    currentQuestionIndex, 
    getCurrentQuestion, 
    getCurrentAnswer,
    nextQuestion,
    completeInterview,
    resetInterview,
    timerEnabled,
    toggleTimer,
    selectedRole,
    saveAnswer,
    abortInterview
  } = useInterview();
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showAbortDialog, setShowAbortDialog] = useState(false);
  const [abortReason, setAbortReason] = useState<string>('');
  const [showRules, setShowRules] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [bannerViolation, setBannerViolation] = useState<FaceViolation | null>(null);
  const [bannerStrikeCount, setBannerStrikeCount] = useState(0);
  
  // Track if the interview is active
  const interviewActive = useRef(true);
  // Ref to WebcamPanel so behavioral violations feed into the unified 2-strike counter
  const webcamPanelRef = useRef<WebcamPanelHandle>(null);

  // Behavioral proctoring (right-click, copy/paste, split-screen, devtools)
  const { latestEvent: behaviorEvent, clearEvent: clearBehaviorEvent } = useBehaviorProctor({
    enabled: !showRules && !!currentInterview && !currentInterview.completed,
  });
  
  // Redirect if no interview is in progress
  useEffect(() => {
    if (!currentInterview && !selectedRole) {
      navigate("/practice");
    }
  }, [currentInterview, selectedRole, navigate]);
  
  // Set up tab visibility monitoring
  useEffect(() => {
    if (!currentInterview || currentInterview.completed || showRules) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && interviewActive.current && currentInterview && !currentInterview.completed) {
        interviewActive.current = false;
        setShowAbortDialog(true);
      }
    };
    
    // Handle window/tab close or browser exit
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentInterview && !currentInterview.completed) {
        // Standard for modern browsers
        e.preventDefault();
        
        // Also abort the interview
        abortInterview(currentInterview.id, "User closed tab or browser");
        
        // For older browsers
        e.returnValue = '';
        return '';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    // Note: window.blur removed — causes false positives (clicking video elements, scrollbars etc.).
    // Split-screen / resize is handled by useBehaviorProctor with 2-strike system.

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentInterview, abortInterview, showRules]);

  // Handle behavioral violations — route into the SAME unified 2-strike counter as face/object
  useEffect(() => {
    if (!behaviorEvent || !interviewActive.current || !currentInterview || currentInterview.completed) return;
    clearBehaviorEvent();
    // Let WebcamPanel's handleGlobalStrike do the counting (shared with face/object violations)
    webcamPanelRef.current?.triggerBehaviorStrike(behaviorEvent.type, behaviorEvent.message);
  }, [behaviorEvent, currentInterview, clearBehaviorEvent]);
  
  // Handle interview abort
  const handleAbortInterview = () => {
    if (currentInterview) {
      const reason = abortReason || 'Interview aborted due to proctoring violation';
      abortInterview(currentInterview.id, reason);
      // Fire-and-forget: log violation for admin dashboard
      fetch('/api/proctor/violation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId: currentInterview.id, reason, strikeCount: 2 }),
      }).catch(() => {});
      setShowAbortDialog(false);
      navigate('/practice');
      toast({
        title: 'Interview Aborted',
        description: reason,
        variant: 'destructive',
      });
    }
  };

  // Handle face/object/behavior proctoring — 1st strike = warning toast + banner
  const handleFaceWarning = useCallback((violation: FaceViolation) => {
    setBannerStrikeCount(1);
    setBannerViolation(violation);
    toast({
      title: "⚠️ Proctoring Warning (Strike 1/2)",
      description: violation.message,
      variant: "destructive",
    });
  }, [toast]);

  // Handle face/object/behavior proctoring — 2nd strike = abort + banner
  const handleFaceViolation = useCallback((violation: FaceViolation) => {
    if (!interviewActive.current) return;
    interviewActive.current = false;
    setBannerStrikeCount(2);
    setBannerViolation(violation);
    setAbortReason(violation.message);
    setShowAbortDialog(true);
  }, []);
  
  // Handle timer timeout
  const handleTimeout = async () => {
    const answer = getCurrentAnswer();
    if (!answer) {
      // If there's no answer, save an empty one
      await saveAnswer("No answer provided (time expired)");
    } else {
      // If there's a partial answer, save it as is
      await saveAnswer(answer.text);
    }
    // Automatically move to the next question
    nextQuestion();
  };

  const handleComplete = () => {
    // completeInterview() handles navigation internally based on interview type
    completeInterview();
  };

  const isLastQuestion = currentInterview && 
    currentQuestionIndex === currentInterview.questions.length - 1;

  const handleAcceptRules = () => {
    setShowRules(false);
    // Reset the activity monitoring
    interviewActive.current = true;
    
    // Request full-screen mode
    requestFullScreen();
    
    toast({
      title: "Interview Started",
      description: "You've accepted the rules. Your interview has now begun.",
    });
  };
  
  // Full-screen management
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
  
  // Monitor full-screen changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);
  
  // Exit full-screen when interview is completed or aborted
  useEffect(() => {
    if ((currentInterview?.completed || showAbortDialog) && document.fullscreenElement) {
      exitFullScreen();
    }
  }, [currentInterview?.completed, showAbortDialog]);

  const handleCancelRules = () => {
    resetInterview();
    navigate("/home");
  };
  
  // Check for loading state - be more specific about what we're waiting for
  if (!currentInterview) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Interview...</h1>
          <p className="text-muted-foreground">
            If you're not redirected, please return to home and start a new interview.
          </p>
          <Button className="mt-8" onClick={() => navigate("/home")}>
            Return to Home
          </Button>
        </div>
      </Layout>
    );
  }
  
  // Show rules first
  if (showRules) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto px-4 py-12">
          <InterviewRules onAccept={handleAcceptRules} onCancel={handleCancelRules} />
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="interview-container">
        {/* Webcam panel positioned at top-right */}
        <div className="fixed top-4 right-4 w-64 h-48 z-50 border-2 border-border rounded-lg overflow-hidden bg-background shadow-lg">
          <div className="flex items-center justify-center p-2 bg-primary text-primary-foreground text-sm font-medium">
            <Video className="h-4 w-4 mr-2" />
            Interview Monitoring
          </div>
          <div className="h-40">
            <WebcamPanel ref={webcamPanelRef} onViolation={handleFaceViolation} onWarning={handleFaceWarning} />
          </div>
        </div>

        {/* Proctoring banner — full-width alert for violations */}
        <ProctoringBanner violation={bannerViolation} strikeCount={bannerStrikeCount} />

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {currentInterview.roleName} Interview
            </h1>
            <p className="text-muted-foreground">
              Answer each question to the best of your ability
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="timer-toggle" 
                checked={timerEnabled}
                onCheckedChange={toggleTimer}
              />
              <Label htmlFor="timer-toggle" className="flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                Timer (90 sec/question)
              </Label>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullScreen}
              className="flex items-center gap-2"
              title={isFullScreen ? "Exit full-screen" : "Enter full-screen"}
            >
              {isFullScreen ? (
                <><Minimize className="h-4 w-4" /> Exit Full-screen</>
              ) : (
                <><Maximize className="h-4 w-4" /> Full-screen</>
              )}
            </Button>
            
            {isLastQuestion && getCurrentAnswer() && (
              <Button 
                variant="default" 
                className="bg-primary hover:bg-primary/90"
                onClick={handleComplete}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Complete Interview
              </Button>
            )}
          </div>
        </div>
        
        <InterviewProgress />
        
        {timerEnabled && (
          <QuestionTimer 
            onTimeout={handleTimeout} 
            duration={90} 
            questionIndex={currentQuestionIndex}
          />
        )}
        
        <Card>
          <CardContent className="pt-6">
            <QuestionDisplay 
              question={currentInterview.questions[currentQuestionIndex]} 
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={currentInterview.questions.length}
            />
            
            <AnswerInput />
          </CardContent>
        </Card>
        
        {getCurrentAnswer() && getCurrentAnswer()?.feedback && (
          <FeedbackDisplay answer={getCurrentAnswer()!} />
        )}
      </div>
      
      <AlertDialog open={showAbortDialog} onOpenChange={setShowAbortDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Interview Aborted</AlertDialogTitle>
            <AlertDialogDescription>
              {abortReason || 'Your interview has been aborted because you switched tabs, used split-screen, or exited the interview. Please start again without switching tabs or windows during the interview.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleAbortInterview}>
              Return to Home
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Interview;
