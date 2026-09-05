
import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Eye, 
  UserX, 
  Smartphone, 
  MonitorX, 
  Bot, 
  ArrowRight,
  ThumbsUp,
  Check,
  Camera,
  AlertTriangle,
  Timer,
  Mic,
  BookOpen,
  Ban,
  Maximize,
  Brain,
  ScanFace,
  FileText,
  Zap
} from "lucide-react";

interface InterviewRulesProps {
  onAccept: () => void;
  onCancel: () => void;
}

const InterviewRules: React.FC<InterviewRulesProps> = ({ onAccept, onCancel }) => {
  return (
    <Card className="w-full max-w-5xl mx-auto shadow-xl dark:border-gray-700">
      {/* Header */}
      <CardHeader className="space-y-1 text-center bg-gradient-to-r from-mockmate-primary to-blue-600 text-white rounded-t-lg py-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="h-8 w-8" />
          <CardTitle className="text-3xl font-bold">Interview Guidelines</CardTitle>
        </div>
        <CardDescription className="text-white/90 text-base max-w-2xl mx-auto">
          Please read these guidelines carefully before starting. Your interview is proctored with AI-powered monitoring to ensure fairness.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-8 space-y-8 px-6 md:px-10">

        {/* Interview Structure Overview */}
        <div>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
            <Brain className="h-5 w-5 text-mockmate-primary" />
            What to Expect
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
              <Badge className="bg-blue-600 text-white mb-2">Round 1</Badge>
              <h4 className="font-semibold text-sm text-foreground mb-1">Aptitude Test</h4>
              <p className="text-xs text-muted-foreground">25 MCQ questions across Logical, Quantitative, Verbal, Data Interpretation & Technical categories</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4 text-center">
              <Badge className="bg-purple-600 text-white mb-2">Round 2</Badge>
              <h4 className="font-semibold text-sm text-foreground mb-1">AI Mock Interview</h4>
              <p className="text-xs text-muted-foreground">Role-specific questions with 90-second timer. AI evaluates relevance, clarity & confidence per answer</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
              <Badge className="bg-green-600 text-white mb-2">Results</Badge>
              <h4 className="font-semibold text-sm text-foreground mb-1">Admin Review</h4>
              <p className="text-xs text-muted-foreground">Round 1 scores go under admin review. If shortlisted, you'll receive an email for Round 2</p>
            </div>
          </div>
        </div>

        {/* Do's and Don'ts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Do's */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-green-600 dark:text-green-400">
              <ThumbsUp className="h-5 w-5" />
              Do's
            </h3>
            
            <div className="space-y-3 bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Stay in front of your webcam</p>
                  <p className="text-xs text-muted-foreground">Keep your face clearly visible throughout the session. The AI monitors your presence continuously.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Use your own knowledge & experience</p>
                  <p className="text-xs text-muted-foreground">Answer genuinely. AI detection checks for AI-generated text patterns like ChatGPT outputs.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Stay focused on the interview tab</p>
                  <p className="text-xs text-muted-foreground">Do not switch to other tabs or windows. The session stays fullscreen for a distraction-free experience.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Ensure a clean, quiet environment</p>
                  <p className="text-xs text-muted-foreground">Remove phones, books, and other devices from your desk. Only one person should be visible on camera.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Use voice input when available</p>
                  <p className="text-xs text-muted-foreground">In Round 2, use the microphone button for speech-to-text. Use <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">Shift+Enter</kbd> for multi-line text answers.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Grant webcam & microphone permissions</p>
                  <p className="text-xs text-muted-foreground">Allow browser access when prompted. These are required for proctoring and voice features. Enable before starting the interview</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Don'ts */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
              <Ban className="h-5 w-5" />
              Don'ts
            </h3>
            
            <div className="space-y-3 bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MonitorX className="h-5 w-5 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Don't switch tabs or windows</p>
                  <p className="text-xs text-muted-foreground">Tab switching, Alt+Tab, or losing window focus triggers <strong>instant disqualification</strong> — no warnings.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Maximize className="h-5 w-5 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Don't use split-screen or resize the window</p>
                  <p className="text-xs text-muted-foreground">Resizing the browser or split-screening is detected and results in <strong>instant disqualification</strong>.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Bot className="h-5 w-5 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Don't use AI tools (ChatGPT, Copilot, etc.)</p>
                  <p className="text-xs text-muted-foreground">Every answer is scanned for AI-generated patterns. Flagged answers receive a <strong>1.5-point penalty each</strong>.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Smartphone className="h-5 w-5 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Don't keep phones or devices nearby</p>
                  <p className="text-xs text-muted-foreground">AI object detection identifies phones, remotes, and books on camera. Detected objects count as a proctoring strike.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <UserX className="h-5 w-5 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Don't let others appear on camera</p>
                  <p className="text-xs text-muted-foreground">Multiple faces detected by AI or leaving the camera frame for more than 5 seconds triggers a strike.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Eye className="h-5 w-5 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Don't close or navigate away</p>
                  <p className="text-xs text-muted-foreground">Closing the browser or navigating away will abort your interview. Progress may not be saved.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Proctoring System Explainer */}
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-5">
          <h3 className="font-bold text-base flex items-center gap-2 text-orange-700 dark:text-orange-400 mb-3">
            <ScanFace className="h-5 w-5" />
            AI Proctoring System — 2-Strike Rule
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 font-bold text-xs rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <p className="font-semibold text-foreground">Strike 1 — Warning</p>
                <p className="text-xs text-muted-foreground">A warning banner appears at the top of your screen. You can continue, but be careful — this is your only warning.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 font-bold text-xs rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <p className="font-semibold text-foreground">Strike 2 — Disqualified</p>
                <p className="text-xs text-muted-foreground">Your interview is immediately aborted. Results are saved as disqualified with a score of 0 and flagged for admin review.</p>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800">
            <p className="text-xs text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <strong>Note:</strong> Tab switching, split-screen, and window focus loss bypass the strike system and result in <strong>instant disqualification</strong>.
            </p>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-5">
          <h3 className="font-bold text-base flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-3">
            <Zap className="h-5 w-5" />
            Quick Tips for Success
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Timer className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Round 2 Timer:</strong> You get 90 seconds per question. A red warning appears when 27 seconds are left.</p>
            </div>
            <div className="flex items-start gap-2">
              <Mic className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Voice Input:</strong> Click the mic icon to speak your answer. It converts speech to text automatically.</p>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Resume ATS:</strong> Upload your resume beforehand for a compatibility score. Minimum 60% required to proceed.</p>
            </div>
            <div className="flex items-start gap-2">
              <Camera className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Webcam Panel:</strong> Your webcam feed appears in the top-right corner showing your proctor status and strike count.</p>
            </div>
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Be Natural:</strong> Use your own words. Answers with filler words ("um", "like") actually score better on the AI naturalness check.</p>
            </div>
            <div className="flex items-start gap-2">
              <Maximize className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Fullscreen:</strong> The interview opens in fullscreen mode. Don't exit — use the built-in toggle if needed.</p>
            </div>
          </div>
        </div>

      </CardContent>
      
      <CardFooter className="flex flex-col sm:flex-row gap-3 justify-end px-6 md:px-10 pb-8">
        <Button variant="outline" onClick={onCancel} className="dark:border-gray-600 dark:hover:bg-gray-800">
          Cancel
        </Button>
        <Button onClick={onAccept} className="gap-2 bg-mockmate-primary hover:bg-mockmate-primary/90 px-8">
          <Shield className="h-4 w-4" />
          I Understand & Accept
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InterviewRules;
