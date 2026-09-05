
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useInterview } from "@/contexts/InterviewContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generatePDF } from "@/utils/reportUtils";
import LearningRecommendations from "@/components/LearningRecommendations";
import { analyzeSkillGaps } from "@/utils/learningRecommendations";
import { 
  Download, 
  FileText, 
  CheckCircle, 
  XCircle, 
  BarChart, 
  RefreshCw,
  Shield
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Summary = () => {
  const { currentInterview, resetInterview } = useInterview();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Redirect if no completed interview
  useEffect(() => {
    if (!currentInterview || !currentInterview.completed) {
      navigate("/home");
    }
  }, [currentInterview, navigate]);

  // Block non-admin users from viewing formal interview results
  // Only practice interviews should show results to regular users
  useEffect(() => {
    if (currentInterview && !currentInterview.isPracticeMode && !user?.isAdmin) {
      // Redirect non-admin users trying to view formal interview summary
      navigate("/interview-thank-you");
    }
  }, [currentInterview, user, navigate]);
  
  if (!currentInterview || !currentInterview.score) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">No Interview Summary Available</h1>
          <p className="text-muted-foreground">
            Complete an interview to see your summary.
          </p>
          <Button className="mt-8" onClick={() => navigate("/home")}>
            Start New Interview
          </Button>
        </div>
      </Layout>
    );
  }

  // Additional check: If it's a formal interview and user is not admin, show access denied
  if (!currentInterview.isPracticeMode && !user?.isAdmin) {
    return (
      <Layout>
        <div className="container max-w-4xl mx-auto px-4 py-16 text-center">
          <Alert className="max-w-2xl mx-auto">
            <Shield className="h-5 w-5" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>
              Interview results are being processed and will be shared via email. 
              Please check your History page for updates.
            </AlertDescription>
          </Alert>
          <Button className="mt-8" onClick={() => navigate("/history")}>
            Go to History
          </Button>
        </div>
      </Layout>
    );
  }
  
  const skillGapAnalysis = useMemo(() => {
    if (!currentInterview) return null;
    return analyzeSkillGaps(currentInterview, currentInterview.answers);
  }, [currentInterview]);
  
  const handleDownloadReport = () => {
    generatePDF(currentInterview);
  };
  
  const handleStartNew = () => {
    resetInterview();
    navigate("/home");
  };
  
  // Find best and weakest answers
  const sortedAnswers = [...currentInterview.answers]
    .filter(answer => answer.feedback)
    .sort((a, b) => 
      (b.feedback?.overall || 0) - (a.feedback?.overall || 0)
    );
  
  const bestAnswer = sortedAnswers[0];
  const weakestAnswer = sortedAnswers[sortedAnswers.length - 1];
  
  // Get the corresponding questions
  const getBestQuestion = () => {
    if (!bestAnswer) return null;
    return currentInterview.questions.find(q => q.id === bestAnswer.questionId);
  };
  
  const getWeakestQuestion = () => {
    if (!weakestAnswer) return null;
    return currentInterview.questions.find(q => q.id === weakestAnswer.questionId);
  };
  
  const bestQuestion = getBestQuestion();
  const weakestQuestion = getWeakestQuestion();
  
  // Get progress color
  const getScoreColor = (score: number) => {
    if (score >= 8) return "bg-green-600";
    if (score >= 5) return "bg-amber-600";
    return "bg-red-600";
  };
  
  const date = new Date(currentInterview.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  return (
    <Layout>
      <div className="interview-container pb-16">
        <div className="text-center mb-12">
          {user?.isAdmin && !currentInterview.isPracticeMode && (
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">
                <Shield className="h-4 w-4" />
                Admin View - Candidate Results Hidden
              </span>
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {currentInterview.isPracticeMode ? 'Practice ' : ''}Interview Performance
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {currentInterview.roleName} Interview | {date}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" />
                Overall Score
              </CardTitle>
              <CardDescription>
                Your performance across all questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-5xl font-bold mb-4 text-primary">
                  {currentInterview.score.toFixed(1)}
                  <span className="text-xl text-muted-foreground">/10</span>
                </div>
                <Progress 
                  value={currentInterview.score * 10} 
                  className={`h-3 w-full max-w-md mx-auto ${getScoreColor(currentInterview.score)}`} 
                />
                <p className="mt-8 text-muted-foreground px-4">
                  {currentInterview.feedback}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-8">
            {bestQuestion && bestAnswer && bestAnswer.feedback && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Strongest Answer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium mb-2">"{bestQuestion.text}"</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <span className="text-green-600 font-semibold">
                      Score: {bestAnswer.feedback.overall.toFixed(1)}/10
                    </span>
                    <span>•</span>
                    <span>
                      Tone: {bestAnswer.feedback.tone.charAt(0).toUpperCase() + bestAnswer.feedback.tone.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm bg-gray-50 p-3 rounded-md">
                    {bestAnswer.text.substring(0, 150)}...
                  </p>
                </CardContent>
              </Card>
            )}
            
            {weakestQuestion && weakestAnswer && weakestAnswer.feedback && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Area for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium mb-2">"{weakestQuestion.text}"</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <span className="text-red-600 font-semibold">
                      Score: {weakestAnswer.feedback.overall.toFixed(1)}/10
                    </span>
                    <span>•</span>
                    <span>
                      Tone: {weakestAnswer.feedback.tone.charAt(0).toUpperCase() + weakestAnswer.feedback.tone.slice(1)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium mb-1">Suggestions:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {weakestAnswer.feedback.suggestions.map((suggestion, index) => (
                        <li key={index} className="text-muted-foreground">
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        {/* Learning Recommendations */}
        {skillGapAnalysis && (
          <div className="mt-8">
            <LearningRecommendations 
              skillGapAnalysis={skillGapAnalysis}
              title="🚀 Personalized Learning Recommendations"
              showOverallScore={false}
            />
          </div>
        )}
        
        <div className="flex flex-col md:flex-row justify-center gap-6 mt-8">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={handleDownloadReport}
            className="flex items-center gap-2"
          >
            <FileText className="h-5 w-5" />
            <Download className="h-4 w-4" />
            Download Full Report
          </Button>
          
          <Button 
            variant="default" 
            size="lg" 
            onClick={handleStartNew}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Start New Interview
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Summary;
