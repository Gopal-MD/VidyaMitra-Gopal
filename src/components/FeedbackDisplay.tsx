
import { Answer } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, Target, Lightbulb } from "lucide-react";
import { motion } from "framer-motion";

interface FeedbackDisplayProps {
  answer: Answer;
  showLearningTips?: boolean;
  questionCategory?: string;
}

const FeedbackDisplay = ({ answer, showLearningTips = true, questionCategory }: FeedbackDisplayProps) => {
  if (!answer.feedback) return null;
  
  const { feedback } = answer;
  
  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 5) return "text-amber-600";
    return "text-red-600";
  };
  
  const getProgressColor = (score: number) => {
    if (score >= 8) return "bg-green-600";
    if (score >= 5) return "bg-amber-600";
    return "bg-red-600";
  };
  
  const getToneTag = (tone: string) => {
    switch (tone) {
      case "confident":
        return <Badge className="bg-green-100 text-green-800">Confident</Badge>;
      case "uncertain":
        return <Badge className="bg-yellow-100 text-yellow-800">Uncertain</Badge>;
      case "neutral":
      default:
        return <Badge className="bg-gray-100 text-gray-800">Neutral</Badge>;
    }
  };
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg">Answer Feedback</CardTitle>
        <CardDescription>
          AI-powered analysis of your response
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Score</span>
            <span className={`font-bold ${getScoreColor(feedback.overall)}`}>
              {feedback.overall.toFixed(1)}/10
            </span>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Relevance</span>
              <span className={getScoreColor(feedback.relevance)}>
                {feedback.relevance.toFixed(1)}/10
              </span>
            </div>
            <Progress value={feedback.relevance * 10} className={getProgressColor(feedback.relevance)} />
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm">Clarity</span>
              <span className={getScoreColor(feedback.clarity)}>
                {feedback.clarity.toFixed(1)}/10
              </span>
            </div>
            <Progress value={feedback.clarity * 10} className={getProgressColor(feedback.clarity)} />
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm">Confidence</span>
              <span className={getScoreColor(feedback.confidence)}>
                {feedback.confidence.toFixed(1)}/10
              </span>
            </div>
            <Progress value={feedback.confidence * 10} className={getProgressColor(feedback.confidence)} />
          </div>
          
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Detected Tone:</span>
              {getToneTag(feedback.tone)}
            </div>
            
            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {feedback.strengths && feedback.strengths.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center text-green-700">
                    <Target className="h-4 w-4 mr-1" />
                    Strengths
                  </h4>
                  <ul className="space-y-1">
                    {feedback.strengths.slice(0, 3).map((strength, index) => (
                      <li key={index} className="text-sm text-green-600 flex items-start">
                        <span className="text-green-500 mr-2">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {feedback.weaknesses && feedback.weaknesses.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center text-red-700">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Areas to Improve
                  </h4>
                  <ul className="space-y-1">
                    {feedback.weaknesses.slice(0, 3).map((weakness, index) => (
                      <li key={index} className="text-sm text-red-600 flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            {feedback.suggestions && feedback.suggestions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center">
                  <Lightbulb className="h-4 w-4 mr-1 text-yellow-600" />
                  Actionable Suggestions
                </h4>
                <div className="bg-blue-50 rounded-lg p-3">
                  <ul className="space-y-2">
                    {feedback.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-blue-800 flex items-start">
                        <span className="text-blue-600 mr-2 font-bold">{index + 1}.</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {/* Final Feedback */}
            {feedback.final_feedback && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                <h4 className="text-sm font-medium mb-2">Overall Assessment</h4>
                <p className="text-sm text-gray-700">{feedback.final_feedback}</p>
              </div>
            )}
            
            {/* Quick Learning Tips */}
            {showLearningTips && feedback.overall < 8 && (
              <QuickLearningTips 
                score={feedback.overall} 
                category={questionCategory}
                weaknesses={feedback.weaknesses || []}
              />
            )}
          </div>
        </div>

        {feedback.possiblyAI && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              AI Detection Warning 
              {feedback.aiConfidence && ` (${feedback.aiConfidence}% confidence)`}
            </AlertTitle>
            <AlertDescription className="space-y-2">
              <p>This answer may have been generated using AI tools. Please ensure all responses are your own work.</p>
              
              {feedback.aiAnalysis && (
                <div className="mt-3 p-3 bg-background/50 rounded-md text-sm">
                  <p className="font-medium mb-2">Detection Analysis:</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Structure</p>
                      <p className="font-semibold">{feedback.aiAnalysis.structureScore}/100</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vocabulary</p>
                      <p className="font-semibold">{feedback.aiAnalysis.vocabularyScore}/100</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Naturalness</p>
                      <p className="font-semibold">{feedback.aiAnalysis.naturalnessScore}/100</p>
                    </div>
                  </div>
                  
                  {feedback.aiAnalysis.indicators.length > 0 && (
                    <>
                      <p className="font-medium text-xs mb-1">AI Indicators:</p>
                      <ul className="ml-4 space-y-1 text-xs">
                        {feedback.aiAnalysis.indicators.slice(0, 5).map((indicator, idx) => (
                          <li key={idx}>• {indicator}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  
                  {feedback.aiAnalysis.humanSignals.length > 0 && (
                    <>
                      <p className="font-medium text-xs mt-2 mb-1">Human Speech Patterns:</p>
                      <ul className="ml-4 space-y-1 text-xs">
                        {feedback.aiAnalysis.humanSignals.slice(0, 3).map((signal, idx) => (
                          <li key={idx}>• {signal}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

// Quick Learning Tips Component
const QuickLearningTips = ({ 
  score, 
  category, 
  weaknesses 
}: { 
  score: number; 
  category?: string; 
  weaknesses: string[]; 
}) => {
  const getTipsForCategory = (cat?: string, weak: string[] = []) => {
    const tips: string[] = [];
    
    if (score < 5) {
      tips.push("📚 Focus on fundamentals - review basic concepts for this topic");
      tips.push("🎯 Practice similar questions daily to build confidence");
    }
    
    if (cat === "technical") {
      tips.push("💻 Build small projects to apply theoretical knowledge");
      tips.push("🔍 Study system design patterns and best practices");
    } else if (cat === "behavioral") {
      tips.push("📖 Use the STAR method (Situation, Task, Action, Result)");
      tips.push("🗣️ Practice storytelling and clear communication");
    }
    
    if (weak.some(w => w.toLowerCase().includes("communication"))) {
      tips.push("🎤 Practice explaining complex topics to non-technical people");
    }
    
    if (weak.some(w => w.toLowerCase().includes("technical"))) {
      tips.push("⚡ Take online coding challenges on platforms like LeetCode");
    }
    
    return tips.slice(0, 3); // Limit to 3 tips
  };

  const tips = getTipsForCategory(category, weaknesses);
  
  if (tips.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200"
    >
      <h4 className="text-sm font-medium mb-2 flex items-center text-purple-800">
        <Lightbulb className="h-4 w-4 mr-1" />
        Quick Learning Tips
      </h4>
      <ul className="space-y-1">
        {tips.map((tip, index) => (
          <li key={index} className="text-xs text-purple-700">
            {tip}
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

export default FeedbackDisplay;
