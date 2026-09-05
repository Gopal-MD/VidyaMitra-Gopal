import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CheckCircle, XCircle, Loader2, Mic, MessageSquare, Volume2 } from 'lucide-react';
import { jobRoles } from '@/utils/interviewUtils';
import { isElevenLabsAvailable, getUsageStats } from '@/utils/elevenLabsService';

export type InterviewMode = 'friede' | 'elevenlabs';

interface PreInterviewFlowProps {
  onComplete: (name: string, role: string, isFirstTime: boolean, mode?: InterviewMode) => void;
}

export default function PreInterviewFlow({ onComplete }: PreInterviewFlowProps) {
  const [step, setStep] = useState<'info' | 'experience' | 'mode' | 'rules' | 'loading'>('info');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('friede');
  const [agreedToRules, setAgreedToRules] = useState(false);

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && role.trim()) {
      setStep('experience');
    }
  };

  const handleExperienceSubmit = (value: boolean) => {
    setIsFirstTime(value);
    setStep('mode');
  };

  const handleModeSelect = (mode: InterviewMode) => {
    setInterviewMode(mode);
    setStep('rules');
  };

  const handleStartInterview = () => {
    if (agreedToRules) {
      setStep('loading');
      // Simulate initialization
      setTimeout(() => {
        onComplete(name, role, isFirstTime, interviewMode);
      }, 2000);
    }
  };

  // Step 1: Basic Info
  if (step === 'info') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to FRIEDE</CardTitle>
            <CardDescription>Your AI Interview Assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Position Applying For *</Label>
                <Select value={role} onValueChange={setRole} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a position" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobRoles.map((jobRole) => (
                      <SelectItem key={jobRole.id} value={jobRole.title}>
                        {jobRole.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: First Time Experience
  if (step === 'experience') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Hi {name}! 👋</CardTitle>
            <CardDescription>One quick question before we start</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-lg font-medium mb-6">
              Is this your first AI interview experience?
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex flex-col gap-2"
                onClick={() => handleExperienceSubmit(true)}
              >
                <span className="text-2xl">👍</span>
                <span>Yes, First Time</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-24 flex flex-col gap-2"
                onClick={() => handleExperienceSubmit(false)}
              >
                <span className="text-2xl">✨</span>
                <span>I've Done This Before</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Interview Mode Selection
  if (step === 'mode') {
    const elAvail = isElevenLabsAvailable();
    const stats = getUsageStats();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-8">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Choose Interview Mode</CardTitle>
            <CardDescription>Select how you'd like to be interviewed by FRIEDE</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* FRIEDE Text + Voice */}
            <button
              className="w-full text-left p-4 rounded-xl border-2 border-blue-500/30 hover:border-blue-500 bg-blue-950/20 hover:bg-blue-950/40 transition-all group"
              onClick={() => handleModeSelect('friede')}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                  <MessageSquare className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    FRIEDE Text + Voice
                    <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded-full">Recommended</span>
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    AI interview with text transcription, voice responses, and detailed feedback scoring.
                    Powered by Google Gemini.
                  </p>
                </div>
              </div>
            </button>

            {/* ElevenLabs Voice AI */}
            <button
              className={`w-full text-left p-4 rounded-xl border-2 transition-all group ${
                elAvail.available
                  ? 'border-purple-500/30 hover:border-purple-500 bg-purple-950/20 hover:bg-purple-950/40'
                  : 'border-gray-700 bg-gray-900/50 opacity-60 cursor-not-allowed'
              }`}
              onClick={() => elAvail.available && handleModeSelect('elevenlabs')}
              disabled={!elAvail.available}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                  elAvail.available
                    ? 'bg-purple-600/20 group-hover:bg-purple-600/30'
                    : 'bg-gray-800'
                }`}>
                  <Volume2 className={`w-6 h-6 ${elAvail.available ? 'text-purple-400' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1">
                  <h3 className={`font-semibold flex items-center gap-2 ${elAvail.available ? 'text-white' : 'text-gray-500'}`}>
                    FRIEDE Voice AI
                    <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-0.5 rounded-full">
                      <Mic className="w-3 h-3 inline mr-1" />ElevenLabs
                    </span>
                  </h3>
                  <p className={`text-sm mt-1 ${elAvail.available ? 'text-gray-400' : 'text-gray-600'}`}>
                    Real-time voice conversation with natural AI voice. Speak naturally like a real interview.
                  </p>
                  {!elAvail.available && (
                    <p className="text-xs text-yellow-500 mt-2">⚠️ {elAvail.reason}</p>
                  )}
                  {elAvail.available && (
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>{stats.charsRemaining.toLocaleString()} chars remaining</span>
                      <span>•</span>
                      <span>{5 - stats.sessionsToday} sessions left today</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 4: Rules & Agreement
  if (step === 'rules') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-8">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Interview Guidelines</CardTitle>
            <CardDescription>Please read carefully before proceeding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Do's */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Do's
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Speak clearly and at a natural pace</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Answer honestly and provide specific examples</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Use your webcam and microphone throughout</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Take your time to think before answering</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Ask for clarification if needed</span>
                </li>
              </ul>
            </div>

            {/* Don'ts */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                Don'ts
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Don't switch tabs or leave the interview window</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Don't use external resources or notes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Don't pause for extended periods without reason</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Don't provide dishonest or exaggerated answers</span>
                </li>
              </ul>
            </div>

            {/* Agreement Checkbox */}
            <div className="border-t pt-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="agree"
                  checked={agreedToRules}
                  onCheckedChange={(checked) => setAgreedToRules(checked as boolean)}
                />
                <Label htmlFor="agree" className="text-sm cursor-pointer">
                  I have read and understood the guidelines. I agree to follow all rules and I'm ready to proceed with the interview.
                </Label>
              </div>
            </div>

            <Button
              onClick={handleStartInterview}
              disabled={!agreedToRules}
              className="w-full"
              size="lg"
            >
              Start Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 4: Loading
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-8">
      <div className="text-center space-y-6">
        <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Initializing Interview...</h2>
          <p className="text-blue-300">Setting up camera, microphone, and AI systems</p>
        </div>
      </div>
    </div>
  );
}
