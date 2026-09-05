import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { AptitudeMCQ } from '@/components/AptitudeMCQ';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { savePracticeAptitudeResult } from '@/lib/firebaseService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getBalancedQuestionSet, MCQQuestion } from '@/data/aptitudeQuestions';
import { generateYouTubeRecommendations, getYouTubeSearchUrl, YouTubeRecommendation } from '@/utils/youtubeRecommendations';
import { Brain, Target, TrendingUp, Youtube, ExternalLink, RotateCcw, Home } from 'lucide-react';
import { motion } from 'framer-motion';

const AptitudePractice = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [recommendations, setRecommendations] = useState<YouTubeRecommendation[]>([]);

  useEffect(() => {
    // Generate 25 random questions
    const randomQuestions = getBalancedQuestionSet(25);
    setQuestions(randomQuestions);
    setUserAnswers(new Array(25).fill(null));
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

  const handleSubmit = async () => {
    // Generate YouTube recommendations based on performance
    const videoRecs = generateYouTubeRecommendations(questions, userAnswers as number[]);
    setRecommendations(videoRecs);
    setShowResults(true);

    // Save results to Firestore
    if (user) {
      try {
        console.log('Saving aptitude practice results for user:', user.id);
        const score = calculateScore();
        const categoryPerf = getCategoryPerformance();
        
        // Convert category performance to required format
        const categoryPerformance: Record<string, { correct: number; total: number; percentage: number }> = {};
        Object.entries(categoryPerf).forEach(([category, stats]) => {
          categoryPerformance[category] = {
            correct: stats.correct,
            total: stats.total,
            percentage: Math.round((stats.correct / stats.total) * 100)
          };
        });

        // Extract weak topics (categories with < 50% accuracy)
        const weakTopics = Object.entries(categoryPerformance)
          .filter(([_, stats]: [string, { correct: number; total: number; percentage: number }]) => stats.percentage < 50)
          .map(([category, _]) => category);

        const result = await savePracticeAptitudeResult(
          {
            userId: user.id,
            score: score.percentage,
            totalQuestions: score.total,
            correctAnswers: score.correct,
            categoryPerformance,
            weakTopics,
            recommendations: videoRecs.map(rec => ({
              topic: rec.topic,
              videos: [{
                title: rec.description,
                channel: rec.channel,
                searchQuery: rec.searchQuery
              }]
            })),
            completedAt: new Date().toISOString()
          },
          user.id
        );
        
        if (result.success) {
          console.log('✅ Aptitude practice results saved successfully!', result.id);
          toast({
            title: "Results Saved!",
            description: "Your practice results have been saved to history.",
          });
        } else {
          console.error('❌ Failed to save aptitude practice results:', result.error);
          toast({
            title: "Save Failed",
            description: "Could not save results. Please try again.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('❌ Error saving aptitude practice results:', error);
      }
    } else {
      console.warn('⚠️ No user logged in, skipping save');
    }
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (userAnswers[i] === q.correctAnswer) correct++;
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / questions.length) * 100)
    };
  };

  const getCategoryPerformance = () => {
    const performance: Record<string, { correct: number; total: number }> = {};
    
    questions.forEach((q, i) => {
      if (!performance[q.category]) {
        performance[q.category] = { correct: 0, total: 0 };
      }
      performance[q.category].total++;
      if (userAnswers[i] === q.correctAnswer) {
        performance[q.category].correct++;
      }
    });
    
    return performance;
  };

  const handleRetry = () => {
    const randomQuestions = getBalancedQuestionSet(25);
    setQuestions(randomQuestions);
    setUserAnswers(new Array(25).fill(null));
    setCurrentQuestionIndex(0);
    setShowResults(false);
  };

  if (questions.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Brain className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p>Loading questions...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (showResults) {
    const score = calculateScore();
    const categoryPerf = getCategoryPerformance();

    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Score Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-6 w-6" />
                  Practice Test Results
                </CardTitle>
                <CardDescription>Your performance summary and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-4xl font-bold text-blue-600">{score.percentage}%</div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-4xl font-bold text-green-600">{score.correct}</div>
                    <div className="text-sm text-muted-foreground">Correct Answers</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-4xl font-bold text-orange-600">{score.total - score.correct}</div>
                    <div className="text-sm text-muted-foreground">Incorrect Answers</div>
                  </div>
                </div>

                {/* Category Performance */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Category-wise Performance
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(categoryPerf).map(([category, stats]) => {
                      const percentage = Math.round((stats.correct / stats.total) * 100);
                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium capitalize">{category.replace('-', ' ')}</span>
                            <span>{stats.correct}/{stats.total} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                percentage >= 70 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button onClick={handleRetry} className="flex-1">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/practice')} className="flex-1">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Practice
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* YouTube Recommendations */}
            {recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Youtube className="h-6 w-6 text-red-600" />
                    Recommended Learning Resources
                  </CardTitle>
                  <CardDescription>
                    Based on your performance, here are curated video lessons from Feel Free to Learn and CareerRide channels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendations.map((rec, index) => (
                      <Card key={index} className="border-2 hover:border-primary transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="outline">{rec.topic}</Badge>
                            <Youtube className="h-5 w-5 text-red-600" />
                          </div>
                          <h4 className="font-semibold mb-1">{rec.channel}</h4>
                          <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => window.open(getYouTubeSearchUrl(rec.searchQuery), '_blank')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Watch Tutorial
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </Layout>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2">Aptitude Practice Test</h1>
          <p className="text-muted-foreground">Practice makes perfect! No time limit, instant feedback.</p>
        </div>

        <AptitudeMCQ
          question={currentQuestion}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          selectedAnswer={userAnswers[currentQuestionIndex]}
          onAnswerSelect={handleAnswerSelect}
          onNext={handleNext}
          onPrevious={handlePrevious}
          showExplanation={false}
          isFirst={currentQuestionIndex === 0}
          isLast={currentQuestionIndex === questions.length - 1}
        />
      </div>
    </Layout>
  );
};

export default AptitudePractice;
