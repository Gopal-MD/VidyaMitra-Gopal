import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { CodeEditor } from '@/components/CodeEditor';
import { CodingQuestionDisplay } from '@/components/CodingQuestionDisplay';
import { TestCaseResults } from '@/components/TestCaseResults';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  codingQuestions, 
  getRandomQuestionsByDifficulty, 
  getQuestionById 
} from '@/data/codingQuestions';
import { 
  CodingQuestion, 
  CodingSubmission, 
  CodingSession,
  ProgrammingLanguage,
  CodeExecutionResult 
} from '@/types/coding';
import { 
  executeCode, 
  getCodeTemplate, 
  estimateComplexity 
} from '@/utils/codeExecutionService';
import { analyzeCodePerformance } from '@/utils/codePerformanceAnalyzer';
import { savePracticeCodingResult } from '@/lib/firebaseService';
import { 
  Code, 
  Home, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight,
  Trophy,
  Target,
  Clock,
  Lightbulb,
  Play,
  Send,
  Loader2,
  Copy,
  Settings,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';

const CodingPractice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Question and Session State
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<CodingQuestion | null>(null);
  
  // Code State
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<ProgrammingLanguage>('javascript');
  
  // Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<CodeExecutionResult | null>(null);
  
  // Session State
  const [submissions, setSubmissions] = useState<CodingSubmission[]>([]);
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [isGettingHint, setIsGettingHint] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [sessionStartTime] = useState(new Date().toISOString());
  const [showCompletion, setShowCompletion] = useState(false);

  // Initialize with random questions or specific question from dashboard
  useEffect(() => {
    // Check if a specific question was selected from dashboard
    const selectedQuestionId = sessionStorage.getItem('selectedQuestion');
    
    let selectedQuestions: CodingQuestion[];
    
    if (selectedQuestionId) {
      // Load the specific question plus some random ones
      const specificQuestion = getQuestionById(selectedQuestionId);
      if (specificQuestion) {
        // Remove the specific question from the pool and get random ones
        const remainingQuestions = codingQuestions.filter(q => q.id !== selectedQuestionId);
        const randomQuestions = getRandomQuestionsByDifficulty(2, 2, 1).filter(q => q.id !== selectedQuestionId);
        selectedQuestions = [specificQuestion, ...randomQuestions.slice(0, 4)];
      } else {
        selectedQuestions = getRandomQuestionsByDifficulty(2, 2, 1);
      }
      // Clear the session storage
      sessionStorage.removeItem('selectedQuestion');
    } else {
      selectedQuestions = getRandomQuestionsByDifficulty(2, 2, 1);
    }
    
    setQuestions(selectedQuestions);
    
    if (selectedQuestions.length > 0) {
      const firstQuestion = selectedQuestions[0];
      setCurrentQuestion(firstQuestion);
      setCode(getCodeTemplate('javascript', firstQuestion));
    }
  }, []);

  // Update code template when language changes
  useEffect(() => {
    if (currentQuestion) {
      setCode(getCodeTemplate(language, currentQuestion));
      setExecutionResult(null);
    }
  }, [language, currentQuestion]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };

  const handleLanguageChange = (newLang: ProgrammingLanguage) => {
    setLanguage(newLang);
  };

  const handleReset = () => {
    if (currentQuestion) {
      setCode(getCodeTemplate(language, currentQuestion));
      setExecutionResult(null);
      toast({
        title: 'Code Reset',
        description: 'Starter code has been restored'
      });
    }
  };

  const handleRunCode = async () => {
    if (!currentQuestion) return;

    setIsRunning(true);
    setExecutionResult(null);
    setAttemptCount(prev => prev + 1);

    try {
      toast({
        title: 'Running Code...',
        description: 'Testing against sample test cases'
      });

      // Run only visible test cases
      const result = await executeCode(code, currentQuestion, language, false);
      setExecutionResult(result);

      if (result.success) {
        toast({
          title: '✅ Sample Tests Passed',
          description: 'All sample test cases passed! Try submitting your solution.',
        });
      } else {
        toast({
          title: '⚠️ Some Tests Failed',
          description: 'Check the test results below to debug your solution.',
          variant: 'destructive'
        });
      }
    } catch (error: unknown) {
      toast({
        title: 'Execution Error',
        description: error instanceof Error ? error.message : 'Failed to execute code',
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentQuestion) return;

    setIsSubmitting(true);
    setExecutionResult(null);

    try {
      toast({
        title: 'Submitting Solution...',
        description: 'Running all test cases including hidden ones'
      });

      // Run ALL test cases (including hidden)
      const result = await executeCode(code, currentQuestion, language, true);
      setExecutionResult(result);

      const passedTests = result.testResults?.filter(t => t.passed).length || 0;
      const totalTests = result.testResults?.length || 0;
      
      // Calculate submission feedback with enhanced performance analysis
      const performanceAnalysis = analyzeCodePerformance(code, language, currentQuestion);
      const complexity = estimateComplexity(code);
      const correctness = (passedTests / totalTests) * 100;
      const efficiency = performanceAnalysis.efficiency;
      const codeQuality = performanceAnalysis.codeQuality;
      const overallScore = Math.round(
        (correctness * 0.5 + efficiency * 0.25 + codeQuality * 0.25) - (revealedHints.length * 5)
      );

      const submission: CodingSubmission = {
        questionId: currentQuestion.id,
        questionTitle: currentQuestion.title,
        code,
        language,
        passed: result.success,
        passedTests,
        totalTests,
        executionTime: result.executionTime,
        memoryUsed: result.memoryUsed,
        attempts: attemptCount,
        hintsUsed: revealedHints.length,
        timestamp: new Date().toISOString(),
        feedback: {
          correctness,
          efficiency,
          codeQuality,
          overallScore,
          suggestions: performanceAnalysis.suggestions,
          strengths: performanceAnalysis.strengths,
          timeComplexity: performanceAnalysis.timeComplexity,
          spaceComplexity: performanceAnalysis.spaceComplexity
        }
      };

      setSubmissions(prev => [...prev, submission]);

      if (result.success) {
        toast({
          title: '🎉 Accepted!',
          description: `Perfect! All ${totalTests} test cases passed. Score: ${overallScore}/100`,
        });

        // Auto-move to next question after 2 seconds
        setTimeout(() => {
          if (currentQuestionIndex < questions.length - 1) {
            handleNextQuestion();
          } else {
            handleCompletePractice();
          }
        }, 2000);
      } else {
        toast({
          title: '❌ Wrong Answer',
          description: `${passedTests}/${totalTests} test cases passed. Review and try again.`,
          variant: 'destructive'
        });
      }
    } catch (error: unknown) {
      toast({
        title: 'Submission Error',
        description: error instanceof Error ? error.message : 'Failed to submit solution',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHintRequest = (hintIndex: number) => {
    if (!revealedHints.includes(hintIndex)) {
      setRevealedHints(prev => [...prev, hintIndex]);
      toast({
        title: 'Hint Revealed',
        description: 'Note: Using hints will reduce your score by 5 points',
        variant: 'default'
      });
    }
  };

  const getAiHint = async () => {
    setIsGettingHint(true);
    try {
      toast({
        title: 'AI Hint',
        description: 'Think about the problem step by step. Consider the constraints and edge cases.',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to get AI hint. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGettingHint(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(questions[nextIndex]);
      setCode(getCodeTemplate(language, questions[nextIndex]));
      setExecutionResult(null);
      setRevealedHints([]);
      setAttemptCount(0);
      
      toast({
        title: 'Next Problem',
        description: `Moving to problem ${nextIndex + 1}/${questions.length}`
      });
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      setCurrentQuestion(questions[prevIndex]);
      
      // Load previous submission if exists
      const prevSubmission = submissions.find(s => s.questionId === questions[prevIndex].id);
      if (prevSubmission) {
        setCode(prevSubmission.code);
      } else {
        setCode(getCodeTemplate(language, questions[prevIndex]));
      }
      
      setExecutionResult(null);
      setRevealedHints([]);
    }
  };

  const handleCompletePractice = async () => {
    if (!user) return;

    const problemsSolved = submissions.filter(s => s.passed).length;
    const averageScore = submissions.reduce((sum, s) => sum + s.feedback.overallScore, 0) / (submissions.length || 1);
    const timeSpent = Math.floor((new Date().getTime() - new Date(sessionStartTime).getTime()) / 1000 / 60);
    
    const weakAreas: string[] = [];
    const strongAreas: string[] = [];
    
    submissions.forEach(sub => {
      const question = questions.find(q => q.id === sub.questionId);
      if (question) {
        if (!sub.passed) {
          weakAreas.push(question.category);
        } else if (sub.feedback.overallScore >= 80) {
          strongAreas.push(question.category);
        }
      }
    });

    const session: CodingSession = {
      id: `coding-${Date.now()}`,
      userId: user.id,
      userEmail: user.email,
      date: new Date().toISOString(),
      startTime: sessionStartTime,
      endTime: new Date().toISOString(),
      problemsSolved,
      totalProblems: questions.length,
      score: Math.round(averageScore),
      timeSpent,
      submissions,
      weakAreas: [...new Set(weakAreas)],
      strongAreas: [...new Set(strongAreas)],
      completed: true
    };

    try {
      await savePracticeCodingResult(session, user.id);
      setShowCompletion(true);
      
      toast({
        title: 'Practice Complete!',
        description: `Solved ${problemsSolved}/${questions.length} problems. Score: ${Math.round(averageScore)}/100`
      });
    } catch (error) {
      console.error('Failed to save practice results:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not save practice results',
        variant: 'destructive'
      });
    }
  };

  const estimateCodeQuality = (code: string): number => {
    let score = 70; // Base score
    
    // Penalties
    if (code.includes('console.log')) score -= 5;
    if (code.length > 1000) score -= 10; // Too verbose
    if (code.split('\n').length < 5) score -= 10; // Too short/incomplete
    
    // Bonuses
    if (/\/\/|\/\*/.test(code)) score += 10; // Has comments
    if (/const|let/.test(code)) score += 5; // Uses modern JS
    if (/function \w+/.test(code)) score += 5; // Has named functions
    
    return Math.max(0, Math.min(100, score));
  };

  const generateSuggestions = (result: CodeExecutionResult, code: string): string[] => {
    const suggestions: string[] = [];
    
    if (!result.success) {
      suggestions.push('Review the failed test cases carefully');
      suggestions.push('Double-check edge cases and boundary conditions');
    }
    
    if (code.includes('console.log')) {
      suggestions.push('Remove console.log statements from final submission');
    }
    
    if (result.executionTime > 1000) {
      suggestions.push('Consider optimizing for better time complexity');
    }
    
    const complexity = estimateComplexity(code);
    if (complexity.time.includes('²') || complexity.time.includes('ⁿ')) {
      suggestions.push(`Current time complexity (${complexity.time}) can likely be improved`);
    }
    
    return suggestions;
  };

  const progressPercentage = questions.length > 0 
    ? ((currentQuestionIndex + 1) / questions.length) * 100 
    : 0;

  const solvedCount = submissions.filter(s => s.passed).length;

  if (showCompletion) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Card className="p-8">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold mb-2">Practice Complete!</h1>
              <p className="text-muted-foreground mb-6">
                Great job completing this coding practice session
              </p>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Target className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{solvedCount}/{questions.length}</p>
                  <p className="text-sm text-muted-foreground">Problems Solved</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/40 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <Trophy className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {Math.round(submissions.reduce((sum, s) => sum + s.feedback.overallScore, 0) / (submissions.length || 1))}
                  </p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/40 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {Math.floor((new Date().getTime() - new Date(sessionStartTime).getTime()) / 1000 / 60)}m
                  </p>
                  <p className="text-sm text-muted-foreground">Time Spent</p>
                </div>
              </div>

              <div className="flex gap-3 justify-center">
                <Button onClick={() => window.location.reload()} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Practice Again
                </Button>
                <Button onClick={() => navigate('/practice')} variant="outline" className="gap-2">
                  <Home className="h-4 w-4" />
                  Back to Practice Home
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>
      </Layout>
    );
  }

  if (!currentQuestion) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading coding problems...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* HackerRank Style Layout */}
      <div className="flex h-[calc(100vh-64px)] bg-background">
        {/* Left Panel - Problem Description */}
        <div className="w-1/2 bg-background border-r border-border flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Prepare</span>
              <span>›</span>
              <span>Algorithms</span>
              <span>›</span>
              <span>Warmup</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-3">
                  {currentQuestion.title}
                </h1>
                <div className="flex gap-2 mb-4">
                  <Badge 
                    className={
                      currentQuestion.difficulty === 'easy' 
                        ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-0' 
                        : currentQuestion.difficulty === 'medium'
                        ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border-0'
                        : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-0'
                    }
                  >
                    {currentQuestion.difficulty.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="prose prose-gray dark:prose-invert max-w-none">
                <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.description}
                </div>
              </div>

              {/* Example */}
              {currentQuestion.examples.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Example</h3>
                  {currentQuestion.examples.map((example, index) => (
                    <div key={index} className="bg-muted/50 rounded-lg p-4 border border-border">
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-medium text-foreground">Input:</span>
                          <div className="bg-background p-3 rounded mt-2 text-foreground border border-border font-mono">
                            {example.input}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Output:</span>
                          <div className="bg-background p-3 rounded mt-2 text-foreground border border-border font-mono">
                            {example.output}
                          </div>
                        </div>
                        {example.explanation && (
                          <div>
                            <span className="font-medium text-foreground">Explanation:</span>
                            <div className="text-muted-foreground mt-2">
                              {example.explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Format */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Input Format</h3>
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <div className="text-muted-foreground text-sm">
                    {currentQuestion.inputFormat}
                  </div>
                </div>
              </div>

              {/* Constraints */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Constraints</h3>
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <div className="text-muted-foreground text-sm space-y-1">
                    {currentQuestion.constraints.map((constraint, index) => (
                      <div key={index} className="font-mono">• {constraint}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Output Format */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">Output Format</h3>
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <div className="text-muted-foreground text-sm">
                    {currentQuestion.outputFormat}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Code Editor & Results */}
        <div className="w-1/2 bg-background flex flex-col">
          {/* Code Editor - Takes most of the space */}
          <div className="flex-1 min-h-0">
            <CodeEditor
              code={code}
              language={language}
              onChange={handleCodeChange}
              onLanguageChange={handleLanguageChange}
              onRun={handleRunCode}
              onSubmit={handleSubmit}
              onReset={handleReset}
              isRunning={isRunning}
              height="100%"
            />
          </div>

          {/* Results Panel */}
          <div className="h-64 border-t border-border bg-gray-900 dark:bg-gray-950">
            <TestCaseResults result={executionResult} isRunning={isRunning} />
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="bg-background border-t border-border px-6 py-3">
        <div className="flex items-center justify-between">
          <Button
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Problem {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>

          <Button
            onClick={currentQuestionIndex === questions.length - 1 ? handleCompletePractice : handleNextQuestion}
            variant={currentQuestionIndex === questions.length - 1 ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default CodingPractice;
