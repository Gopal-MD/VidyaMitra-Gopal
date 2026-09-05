import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getPracticeAptitudeHistory, 
  getPracticeInterviewHistory,
  getBotInterviewHistory,
  PracticeAptitudeResult,
  PracticeInterviewResult,
  BotInterviewResult 
} from '@/lib/firebaseService';
import { getYouTubeSearchUrl } from '@/utils/youtubeRecommendations';
import { 
  History, 
  Brain, 
  MessageSquare, 
  TrendingUp, 
  Youtube, 
  ExternalLink, 
  Calendar,
  Target,
  Award,
  BookOpen,
  Bot
} from 'lucide-react';
import { motion } from 'framer-motion';

const PracticeHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [aptitudeHistory, setAptitudeHistory] = useState<PracticeAptitudeResult[]>([]);
  const [interviewHistory, setInterviewHistory] = useState<PracticeInterviewResult[]>([]);
  const [botInterviewHistory, setBotInterviewHistory] = useState<BotInterviewResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (user) {
        setLoading(true);
        console.log('🔍 Fetching practice history for user:', user.id);
        const [aptitude, interviews, botInterviews] = await Promise.all([
          getPracticeAptitudeHistory(user.id),
          getPracticeInterviewHistory(user.id),
          getBotInterviewHistory(user.id)
        ]);
        
        // Remove duplicates by ID
        const uniqueAptitude = Array.from(new Map(aptitude.map(item => [item.id, item])).values());
        const uniqueInterviews = Array.from(new Map(interviews.map(item => [item.id, item])).values());
        const uniqueBotInterviews = Array.from(new Map(botInterviews.map(item => [item.id, item])).values());
        
        console.log('📊 Aptitude History:', uniqueAptitude.length, 'unique of', aptitude.length);
        console.log('📊 Interview History:', uniqueInterviews.length, 'unique of', interviews.length);
        console.log('📊 Bot Interview History:', uniqueBotInterviews.length, 'unique of', botInterviews.length);
        
        setAptitudeHistory(uniqueAptitude);
        setInterviewHistory(uniqueInterviews);
        setBotInterviewHistory(uniqueBotInterviews);
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/50';
    if (percentage >= 50) return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/50';
    return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/50';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <History className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p>Loading your practice history...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-mockmate-secondary flex items-center gap-3">
                <History className="h-10 w-10" />
                Practice History
              </h1>
              <p className="text-lg text-muted-foreground mt-2">
                Review your performance and access personalized learning recommendations
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate('/practice')}>
              <BookOpen className="mr-2 h-4 w-4" />
              Back to Practice
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                    <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  <div>
                    <div className="text-2xl font-bold">{aptitudeHistory.length}</div>
                    <div className="text-sm text-muted-foreground">Aptitude Tests</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                    <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="text-2xl font-bold">{interviewHistory.length}</div>
                    <div className="text-sm text-muted-foreground">Interview Sessions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                    <Bot className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <div className="text-2xl font-bold">{botInterviewHistory.length}</div>
                    <div className="text-sm text-muted-foreground">AI Bot Interviews</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                    <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
                  <div>
                    <div className="text-2xl font-bold">
                      {botInterviewHistory.length > 0 
                        ? Math.round(botInterviewHistory.reduce((sum, h) => sum + h.feedback.overallScore, 0) / botInterviewHistory.length)
                        : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Bot Interview Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Tabs for Aptitude and Interview History */}
        <Tabs defaultValue="aptitude" className="space-y-6">
          <TabsList className="grid w-full max-w-[600px] grid-cols-3">
            <TabsTrigger value="aptitude" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Aptitude ({aptitudeHistory.length})
            </TabsTrigger>
            <TabsTrigger value="interviews" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Interviews ({interviewHistory.length})
            </TabsTrigger>
            <TabsTrigger value="bot-interviews" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              AI Bot ({botInterviewHistory.length})
            </TabsTrigger>
          </TabsList>

          {/* Aptitude History Tab */}
          <TabsContent value="aptitude">
            {aptitudeHistory.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Aptitude Practice Yet</h3>
                  <p className="text-muted-foreground mb-6">Start practicing to see your history here</p>
                  <Button onClick={() => navigate('/practice-aptitude')}>
                    Start Aptitude Practice
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {aptitudeHistory.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                              Aptitude Practice Session
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(result.completedAt)}
                            </CardDescription>
                          </div>
                          <Badge className={`text-lg ${getScoreColor(result.score)}`}>
                            {result.score}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Score Summary */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Performance Summary
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Questions:</span>
                                <span className="font-medium">{result.totalQuestions}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Correct Answers:</span>
                                <span className="font-medium text-green-600 dark:text-green-400">{result.correctAnswers}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Incorrect Answers:</span>
                                <span className="font-medium text-red-600 dark:text-red-400">
                                  {result.totalQuestions - result.correctAnswers}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Category Performance */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Category Performance
                            </h4>
                            <div className="space-y-2">
                              {Object.entries(result.categoryPerformance).map(([category, stats]) => (
                                <div key={category} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="capitalize">{category.replace('-', ' ')}</span>
                                    <span className="font-medium">{stats.percentage}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        stats.percentage >= 70 
                                          ? 'bg-green-500' 
                                          : stats.percentage >= 50 
                                          ? 'bg-yellow-500' 
                                          : 'bg-red-500'
                                      }`}
                                      style={{ width: `${stats.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Recommendations */}
                        {result.recommendations.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-border">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Youtube className="h-4 w-4 text-red-600 dark:text-red-400" />
                              Recommended Learning Resources
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {result.recommendations.slice(0, 4).map((rec, idx) => (
                                <div key={idx} className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                                  <div className="font-medium text-sm mb-2 capitalize text-foreground">
                                    {rec.topic.replace('-', ' ')}
                                  </div>
                                  <div className="space-y-1">
                                    {rec.videos.slice(0, 2).map((video, vIdx) => (
                                      <a
                                        key={vIdx}
                                        href={getYouTubeSearchUrl(video.searchQuery)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        {video.title} - {video.channel}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Interview History Tab */}
          <TabsContent value="interviews">
            {interviewHistory.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No Interview Practice Yet</h3>
                  <p className="text-muted-foreground mb-6">Start practicing to see your history here</p>
                  <Button onClick={() => navigate('/practice')}>
                    Start Interview Practice
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {interviewHistory.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              {result.roleName}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(result.completedAt)}
                            </CardDescription>
                          </div>
                          <Badge className={`text-lg ${getScoreColor(result.overallScore)}`}>
                            {result.overallScore}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Performance Summary */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              Performance Summary
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Questions:</span>
                                <span className="font-medium">{result.questions.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Average Score:</span>
                                <span className="font-medium">{result.averageQuestionScore}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Overall Rating:</span>
                                <Badge variant="outline">
                                  {result.overallScore >= 70 ? 'Excellent' : result.overallScore >= 50 ? 'Good' : 'Needs Improvement'}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Strengths & Improvements */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Key Insights
                            </h4>
                            <div className="space-y-3 text-sm">
                              {result.strengths.length > 0 && (
                                <div>
                                  <div className="text-green-600 dark:text-green-400 font-medium mb-1">Strengths:</div>
                                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    {result.strengths.slice(0, 2).map((strength, idx) => (
                                      <li key={idx}>{strength}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {result.improvements.length > 0 && (
                                <div>
                                  <div className="text-orange-600 dark:text-orange-400 font-medium mb-1">Areas to Improve:</div>
                                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    {result.improvements.slice(0, 2).map((improvement, idx) => (
                                      <li key={idx}>{improvement}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Recommendations */}
                        {result.recommendations.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-border">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              Recommendations
                            </h4>
                            <ul className="space-y-2 text-sm">
                              {result.recommendations.slice(0, 3).map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-primary mt-0.5">•</span>
                                  <span className="text-muted-foreground">{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Bot Interview History Tab */}
          <TabsContent value="bot-interviews">
            {botInterviewHistory.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">No AI Bot Interviews Yet</h3>
                  <p className="text-muted-foreground mb-6">Experience real-time AI interviews with FRIEDE</p>
                  <Button onClick={() => navigate('/bot-interview')}>
                    Start AI Bot Interview
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {botInterviewHistory.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                              FRIEDE Interview - {result.role}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(result.completedAt)}
                            </CardDescription>
                            <div className="mt-2">
                              <span className="text-sm text-muted-foreground">Candidate: </span>
                              <span className="text-sm font-medium">{result.candidateName}</span>
                            </div>
                          </div>
                          <Badge className={`text-lg ${getScoreColor(result.feedback.overallScore)}`}>
                            {result.feedback.overallScore}/100
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Conversation Summary */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              Conversation Summary
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Exchanges:</span>
                                <span className="font-medium">{result.conversationLog?.length || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Your Responses:</span>
                                <span className="font-medium">
                                  {result.conversationLog?.filter(m => m.role === 'candidate')?.length || 0}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">FRIEDE's Questions:</span>
                                <span className="font-medium">
                                  {result.conversationLog?.filter(m => m.role === 'friede')?.length || 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Strengths & Improvements */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Key Feedback
                            </h4>
                            <div className="space-y-3 text-sm">
                              {result.feedback.strengths.length > 0 && (
                                <div>
                                  <div className="text-green-600 dark:text-green-400 font-medium mb-1">✓ Strengths:</div>
                                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    {result.feedback.strengths.slice(0, 2).map((strength, idx) => (
                                      <li key={idx}>{strength}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {result.feedback.improvements.length > 0 && (
                                <div>
                                  <div className="text-orange-600 dark:text-orange-400 font-medium mb-1">→ Improvements:</div>
                                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                    {result.feedback.improvements.slice(0, 2).map((improvement, idx) => (
                                      <li key={idx}>{improvement}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Detailed Feedback */}
                        {result.feedback.detailedFeedback && (
                          <div className="mt-6 pt-6 border-t border-border">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Bot className="h-4 w-4" />
                              FRIEDE's Detailed Feedback
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {result.feedback.detailedFeedback}
                            </p>
                          </div>
                        )}

                        {/* View Transcript Button */}
                        <div className="mt-6 pt-6 border-t border-border flex gap-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // Show conversation in a dialog or expand section
                              alert(`Transcript:\n\n${result.conversationLog.map(m => 
                                `${m.role === 'friede' ? 'FRIEDE' : 'YOU'}: ${m.message}`
                              ).join('\n\n')}`);
                            }}
                          >
                            View Full Transcript
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate('/bot-interview')}
                          >
                            Practice Again
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default PracticeHistory;
