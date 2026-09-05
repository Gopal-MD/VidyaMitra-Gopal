import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useInterview } from "@/contexts/InterviewContext";
import { useAuth } from "@/contexts/AuthContext";
import { savePracticeInterviewResult } from "@/lib/firebaseService";
import InterviewProgress from "@/components/InterviewProgress";
import QuestionDisplay from "@/components/QuestionDisplay";
import AnswerInput from "@/components/AnswerInput";
import FeedbackDisplay from "@/components/FeedbackDisplay";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Home, 
  Lightbulb, 
  Target,
  Zap,
  BookOpen,
  TrendingUp,
  Trophy
} from "lucide-react";
import { motion } from "framer-motion";
import LearningRecommendations from "@/components/LearningRecommendations";
import { analyzeSkillGaps } from "@/utils/learningRecommendations";

const PracticeInterview = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    currentInterview, 
    getCurrentQuestion,
    saveAnswer, 
    nextQuestion, 
    resetInterview,
    isLoading,
    getCurrentAnswer,
    getProgressPercentage,
    currentQuestionIndex 
  } = useInterview();

  const [isPaused, setIsPaused] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [showCompletion, setShowCompletion] = useState(false);
  const [skillGapAnalysis, setSkillGapAnalysis] = useState(null);
  const [hasSavedResults, setHasSavedResults] = useState(false);
  const [practiceStats, setPracticeStats] = useState({
    questionsAnswered: 0,
    averageScore: 0,
    totalTime: 0,
    startTime: Date.now()
  });

  useEffect(() => {
    // Check if we have an active interview
    if (!currentInterview) {
      navigate("/practice");
      return;
    }
    // Reset saved flag when starting new interview
    setHasSavedResults(false);
  }, [currentInterview, navigate]);

  useEffect(() => {
    // Update practice stats when questions are answered
    if (currentInterview && currentInterview.answers.length > 0) {
      const answered = currentInterview.answers.length;
      const totalScore = currentInterview.answers.reduce((sum, answer) => 
        sum + (answer.feedback?.overall || 0), 0
      );
      const avgScore = totalScore / answered;
      
      setPracticeStats(prev => ({
        ...prev,
        questionsAnswered: answered,
        averageScore: avgScore,
        totalTime: Math.floor((Date.now() - prev.startTime) / 1000)
      }));
    }
  }, [currentInterview]);

  // Check if practice session is completed
  useEffect(() => {
    if (currentInterview && currentInterview.answers.length === currentInterview.questions.length && !hasSavedResults) {
      // Practice completed - generate skill gap analysis
      const skillGaps = analyzeSkillGaps(currentInterview, currentInterview.answers);
      setSkillGapAnalysis(skillGaps);
      setShowCompletion(true);

      // Save practice results to Firestore (only once)
      if (user) {
        const saveResults = async () => {
          try {
            console.log('Saving interview practice results for user:', user.id);
            setHasSavedResults(true); // Prevent duplicate saves
            const allFeedback = currentInterview.answers.map(a => a.feedback);
            const overallScore = Math.round(
              allFeedback.reduce((sum, fb) => sum + (fb?.overall || 0), 0) / allFeedback.length
            );

            const allStrengths = allFeedback.flatMap(fb => fb?.strengths || []);
            const allImprovements = allFeedback.flatMap(fb => fb?.improvements || []);

            // Clean recommendations - remove undefined values
            const recommendations = (skillGaps?.recommendations || [])
              .map(r => r?.resource)
              .filter((r): r is string => typeof r === 'string' && r.length > 0);

            const result = await savePracticeInterviewResult(
              {
                userId: user.id,
                roleId: currentInterview.roleId || 'unknown',
                roleName: currentInterview.roleName || 'Unknown Role',
                questions: currentInterview.questions.map((q, idx) => ({
                  question: q.question || '',
                  answer: currentInterview.answers[idx]?.answer || '',
                  feedback: currentInterview.answers[idx]?.feedback || {
                    score: 0,
                    strengths: [],
                    improvements: [],
                    rating: 'Needs Improvement'
                  }
                })),
                overallScore,
                averageQuestionScore: overallScore,
                strengths: Array.from(new Set(allStrengths)).filter(s => s).slice(0, 5),
                improvements: Array.from(new Set(allImprovements)).filter(i => i).slice(0, 5),
                recommendations: recommendations.slice(0, 5),
                completedAt: new Date().toISOString()
              },
              user.id
            );
            
            if (result.success) {
              console.log('✅ Interview practice results saved successfully!', result.id);
              toast({
                title: "Results Saved!",
                description: "Your practice session has been saved to history.",
              });
            } else {
              console.error('❌ Failed to save interview practice results:', result.error);
              toast({
                title: "Save Failed",
                description: "Could not save results. Please try again.",
                variant: "destructive"
              });
            }
          } catch (error) {
            console.error('❌ Error saving interview practice results:', error);
          }
        };
        
        saveResults();
      } else {
        console.warn('⚠️ No user logged in, skipping save');
      }
    }
  }, [currentInterview, user, hasSavedResults, toast]);

  const handleSaveAndNext = async (answer: string) => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return;

    try {
      await saveAnswer(answer);
      
      // Auto-advance to next question after a short delay
      setTimeout(() => {
        if (currentInterview && currentInterview.questions.length > currentInterview.answers.length) {
          nextQuestion();
        } else {
          // End of practice session
          toast({ title: "Practice Complete!", description: "Great job! Practice session completed." });
        }
      }, 1500); // Show feedback for 1.5 seconds
      
    } catch (error) {
      console.error("Failed to save answer:", error);
      toast({ title: "Error", description: "Failed to save answer. Please try again.", variant: "destructive" });
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    toast({ title: isPaused ? "Practice Resumed" : "Practice Paused", description: isPaused ? "Continue your practice session" : "Practice session paused" });
  };

  const handleRestart = () => {
    resetInterview();
    setPracticeStats({
      questionsAnswered: 0,
      averageScore: 0,
      totalTime: 0,
      startTime: Date.now()
    });
    toast({ title: "Practice Restarted", description: "Practice session has been restarted." });
  };

  const handleGoHome = () => {
    navigate("/practice");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = getCurrentQuestion();
  
  if (!currentInterview || !currentQuestion) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">No Active Practice Session</h2>
          <p className="text-muted-foreground mb-6">
            Start a new practice session to begin improving your interview skills.
          </p>
          <Button onClick={() => navigate("/practice")}>
            <Play className="mr-2 h-4 w-4" />
            Start Practice
          </Button>
        </div>
      </Layout>
    );
  }

  // Show completion screen with learning recommendations
  if (showCompletion && skillGapAnalysis) {
    return (
      <Layout>
        <div className="container max-w-6xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-4 rounded-full">
                <Trophy className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">🎉 Practice Session Complete!</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Great job completing the practice session for {currentInterview.roleName}
            </p>
            
            {/* Practice Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
              <Card>
                <CardContent className="p-4 text-center">
                  <h3 className="text-2xl font-bold text-blue-600">{practiceStats.questionsAnswered}</h3>
                  <p className="text-sm text-muted-foreground">Questions Answered</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <h3 className="text-2xl font-bold text-green-600">{practiceStats.averageScore.toFixed(1)}</h3>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <h3 className="text-2xl font-bold text-purple-600">{Math.floor(practiceStats.totalTime / 60)}m</h3>
                  <p className="text-sm text-muted-foreground">Practice Time</p>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          {/* Learning Recommendations */}
          <LearningRecommendations 
            skillGapAnalysis={skillGapAnalysis}
            title="🎯 Your Personalized Learning Path"
          />

          {/* Action Buttons */}
          <div className="flex flex-col md:flex-row justify-center gap-4 mt-8">
            <Button 
              size="lg" 
              onClick={() => {
                setShowCompletion(false);
                setSkillGapAnalysis(null);
                handleRestart();
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Practice Again
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate("/practice")}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Choose Different Role
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigate("/dashboard")}
            >
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-6xl mx-auto px-4 py-6">
        {/* Header with Practice Controls */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-yellow-500" />
              <div>
                <h1 className="text-2xl font-bold">Practice Session</h1>
                <p className="text-sm text-muted-foreground">
                  Role: {currentInterview?.roleName} • No monitoring • Unlimited time
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <BookOpen className="h-3 w-3 mr-1" />
                Practice Mode
              </Badge>
              <Button
                onClick={handlePauseResume}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? "Resume" : "Pause"}
              </Button>
              <Button
                onClick={handleRestart}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Restart
              </Button>
              <Button
                onClick={handleGoHome}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Home
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Practice Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {practiceStats.questionsAnswered}
                </div>
                <div className="text-sm text-muted-foreground">Questions</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {practiceStats.averageScore.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Score</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatTime(practiceStats.totalTime)}
                </div>
                <div className="text-sm text-muted-foreground">Time</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(getProgressPercentage())}%
                </div>
                <div className="text-sm text-muted-foreground">Progress</div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Practice Tips (Collapsible) */}
        {showHints && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900 mb-2">Practice Tips</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Take your time - there are no time limits in practice mode</li>
                      <li>• Review the feedback carefully to understand areas for improvement</li>
                      <li>• Practice the same question multiple times to perfect your answer</li>
                      <li>• Use the pause feature to think through complex questions</li>
                    </ul>
                  </div>
                  <Button
                    onClick={() => setShowHints(false)}
                    variant="ghost"
                    size="sm"
                    className="text-blue-600"
                  >
                    ×
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Main Interview Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Question and Input */}
          <div className="xl:col-span-2 space-y-6">
            {/* Progress */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <InterviewProgress />
            </motion.div>

            {/* Current Question */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <QuestionDisplay 
                question={currentQuestion} 
                questionNumber={currentQuestionIndex + 1}
                totalQuestions={currentInterview.questions.length}
              />
            </motion.div>

            {/* Answer Input */}
            {!isPaused && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <AnswerInput />
              </motion.div>
            )}

            {isPaused && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Pause className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Practice Paused</h3>
                    <p className="text-muted-foreground mb-4">
                      Take your time to think. Resume when you're ready.
                    </p>
                    <Button onClick={handlePauseResume}>
                      <Play className="mr-2 h-4 w-4" />
                      Resume Practice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Feedback and Progress */}
          <div className="space-y-6">
            {/* Recent Feedback */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              {getCurrentAnswer() && (
                <FeedbackDisplay answer={getCurrentAnswer()!} />
              )}
            </motion.div>

            {/* Practice Progress Overview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <h3 className="font-medium">Session Progress</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Questions Completed</span>
                          <span>{practiceStats.questionsAnswered}/{currentInterview?.questions.length}</span>
                        </div>
                        <Progress 
                          value={currentInterview ? (practiceStats.questionsAnswered / currentInterview.questions.length) * 100 : 0} 
                          className="h-2"
                        />
                      </div>
                      
                      {practiceStats.averageScore > 0 && (
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Average Score</span>
                            <span className={`font-medium ${
                              practiceStats.averageScore >= 8 ? 'text-green-600' :
                              practiceStats.averageScore >= 6 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {practiceStats.averageScore.toFixed(1)}/10
                            </span>
                          </div>
                          <Progress 
                            value={practiceStats.averageScore * 10} 
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t">
                      <Button
                        onClick={() => navigate("/practice")}
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        <Target className="mr-2 h-4 w-4" />
                        Try Different Role
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PracticeInterview;