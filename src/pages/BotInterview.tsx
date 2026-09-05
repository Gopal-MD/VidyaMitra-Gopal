import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BotInterviewProvider, useBotInterview } from '../contexts/BotInterviewContext';
import { friedeService, InterviewContext } from '../utils/friedeService';
import { voiceService, VoiceService } from '../utils/voiceService';
import PreInterviewFlow, { InterviewMode } from '../components/PreInterviewFlow';
import ElevenLabsInterview from '../components/ElevenLabsInterview';
import FriedeAvatar from '../components/FriedeAvatar';
import WebcamPanel from '../components/WebcamPanel';
import TranscriptionPanel from '../components/TranscriptionPanel';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { MessageSquare, Loader2, CheckCircle } from 'lucide-react';
import { saveBotInterviewResult } from '../lib/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../utils/profileService';

function BotInterviewContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    state,
    updatePhase,
    setCandidateInfo,
    updateFriedeContext,
    addMessage,
    setFriedeSpeaking,
    setListening,
    toggleTranscription,
    setFeedback,
  } = useBotInterview();

  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string>('');
  
  // ElevenLabs mode state
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('friede');
  const [elevenLabsInfo, setElevenLabsInfo] = useState<{
    name: string;
    role: string;
    isFirstTime: boolean;
  } | null>(null);

  // Use refs to avoid circular dependencies and stale closures
  const friedeContextRef = useRef<InterviewContext | null>(null);
  const handleCandidateAnswerRef = useRef<(answer: string) => Promise<void>>();
  const completeInterviewRef = useRef<() => Promise<void>>();

  // Handle candidate's answer
  const handleCandidateAnswer = useCallback(async (answer: string) => {
    console.log('🎤 Received answer:', answer);
    
    // Use ref to get latest context
    const currentContext = friedeContextRef.current;
    
    if (!currentContext) {
      console.error('❌ No FRIEDE context available');
      console.error('Context ref value:', friedeContextRef.current);
      console.error('State context value:', state.friedeContext);
      setError('Interview context lost. Please restart the interview.');
      return;
    }

    console.log('✅ Using context:', currentContext);

    try {
      console.log('📡 Calling FRIEDE to generate next question...');
      
      // Generate next question from FRIEDE
      const result = await friedeService.generateNextQuestion(answer, currentContext);
      console.log('✅ Got FRIEDE response:', result);

      // Add FRIEDE's response to conversation
      addMessage('friede', result.response);

      // Speak FRIEDE's response
      setFriedeSpeaking(true);
      voiceService.speak(result.response, () => {
        if (result.shouldContinue) {
          console.log('🔄 Continuing interview, starting to listen...');
          // Continue interview - start listening again
          setFriedeSpeaking(false);
          setListening(true);

          voiceService.startListening({
            onSpeechStart: () => {
              // User started speaking
            },
            onSpeechEnd: async (transcript: string) => {
              setListening(false);
              console.log('📝 New transcript received:', transcript);
              
              // Add candidate's answer to conversation
              addMessage('candidate', transcript);

              // Recursively process next answer
              await handleCandidateAnswer(transcript);
            },
            onSpeechError: (errorMsg: string) => {
              console.error('🎤 Speech error:', errorMsg);
              setError(errorMsg);
              setListening(false);
            },
            onListening: () => {
              setListening(true);
            },
            onSpeaking: () => {
              setFriedeSpeaking(true);
            },
            onSpeakingComplete: () => {
              setFriedeSpeaking(false);
            },
          });
        } else {
          console.log('🏁 Interview complete, generating feedback...');
          // Interview complete - generate feedback
          completeInterviewRef.current?.();
        }
      });

    } catch (err) {
      console.error('❌ Error handling answer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process your answer';
      setError(errorMessage + '. Please try speaking again.');
      
      // Show error but allow retry by restarting listening after a delay
      setTimeout(() => {
        console.log('🔄 Retrying - starting to listen again...');
setFriedeSpeaking(false);
      setListening(true);
      
      voiceService.startListening({
        onSpeechEnd: async (transcript: string) => {
          setListening(false);
          addMessage('candidate', transcript);
          await handleCandidateAnswer(transcript);
        },
        onSpeechError: (errorMsg: string) => {
          setError(errorMsg);
          setListening(false);
        },
      });
    }, 2000);
    }
  }, [addMessage, setFriedeSpeaking, setListening, state.friedeContext]);

  // Update refs
  handleCandidateAnswerRef.current = handleCandidateAnswer;

  // Sync context ref with state
  useEffect(() => {
    if (state.friedeContext) {
      friedeContextRef.current = state.friedeContext;
      console.log('🔄 Context ref synced with state:', state.friedeContext);
    }
  }, [state.friedeContext]);

  // Complete interview and show feedback
  const completeInterview = useCallback(async () => {
    if (!state.friedeContext) return;

    updatePhase('closing');
    setListening(false);

    try {
      // Generate final feedback
      console.log('🎯 Generating final feedback...');
      const feedback = await friedeService.generateFeedback(state.friedeContext);
      console.log('✅ Feedback generated:', feedback);
      setFeedback(feedback);

      // Save to Firebase
      if (user) {
        console.log('💾 Saving bot interview result to Firestore...');
        const result = await saveBotInterviewResult({
          userId: user.id || user.email,
          candidateName: state.candidateName,
          role: state.role,
          conversationLog: state.conversationLog,
          feedback,
          completedAt: new Date().toISOString(),
        }, user.id || user.email);
        
        if (result.success) {
          console.log('✅ Bot interview saved successfully with ID:', result.id);
        } else {
          console.error('❌ Failed to save bot interview:', result.error);
        }
      }

      // Update phase to completed - this will show the feedback screen
      updatePhase('completed');

      // Log to profile activity
      logActivity(
        'bot_interview',
        'AI Interview Completed',
        `Role: ${state.role}, Candidate: ${state.candidateName}`,
        { role: state.role, candidateName: state.candidateName, questionsAnswered: state.conversationLog.length }
      ).catch(() => {});

    } catch (err) {
      console.error('❌ Error completing interview:', err);
      setError('Failed to generate feedback. Please try again.');
    }
  }, [state, user, setFeedback, updatePhase, setListening]);

  // Update refs
  completeInterviewRef.current = completeInterview;

  // Start listening for candidate's response
  const startListening = useCallback(() => {
    setFriedeSpeaking(false);
    setListening(true);

    voiceService.startListening({
      onSpeechStart: () => {
        // User started speaking
      },
      onSpeechEnd: async (transcript: string) => {
        setListening(false);
        
        // Add candidate's answer to conversation
        addMessage('candidate', transcript);

        // Process answer with FRIEDE
        await handleCandidateAnswer(transcript);
      },
      onSpeechError: (errorMsg: string) => {
        console.error('Speech error:', errorMsg);
        setError(errorMsg);
        setListening(false);
      },
      onListening: () => {
        setListening(true);
      },
      onSpeaking: () => {
        setFriedeSpeaking(true);
      },
      onSpeakingComplete: () => {
        setFriedeSpeaking(false);
      },
    });
  }, [addMessage, setListening, setFriedeSpeaking, handleCandidateAnswer]);

  // Initialize interview context
  const initializeInterview = useCallback(async (name: string, role: string, isFirstTime: boolean, mode?: InterviewMode) => {
    // If ElevenLabs mode selected, switch to ElevenLabs component
    if (mode === 'elevenlabs') {
      setInterviewMode('elevenlabs');
      setElevenLabsInfo({ name, role, isFirstTime });
      setCandidateInfo(name, role, isFirstTime);
      updatePhase('active');
      return;
    }

    setInterviewMode('friede');
    setIsInitializing(true);
    setError('');

    try {
      // Check browser support
      if (!VoiceService.isSupported()) {
        throw new Error('Your browser does not support speech recognition. Please use Chrome or Edge.');
      }

      // Request microphone permission
      const micPermission = await VoiceService.requestMicrophonePermission();
      if (!micPermission) {
        throw new Error('Microphone access is required for the interview.');
      }

      // Set candidate info
      setCandidateInfo(name, role, isFirstTime);

      // Start interview with FRIEDE and get context
      const { greeting, context } = await friedeService.startInterview(name, role, isFirstTime);
      
      // Store context in both state and ref
      updateFriedeContext(context);
      friedeContextRef.current = context;
      console.log('✅ Context stored in state and ref:', context);

      // Add greeting to conversation
      addMessage('friede', greeting);

      // Update phase
      updatePhase('active');

      // Speak greeting
      voiceService.speak(greeting, () => {
        // After greeting, start listening
        startListening();
      });

      setFriedeSpeaking(true);

    } catch (err: unknown) {
      console.error('Error initializing interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize interview. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  }, [setCandidateInfo, updateFriedeContext, addMessage, updatePhase, setFriedeSpeaking, startListening, setInterviewMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceService.destroy();
    };
  }, []);

  // Pre-interview flow
  if (state.phase === 'pre-interview') {
    return <PreInterviewFlow onComplete={initializeInterview} />;
  }

  // ElevenLabs Voice AI mode
  if (interviewMode === 'elevenlabs' && elevenLabsInfo) {
    return (
      <ElevenLabsInterview
        candidateName={elevenLabsInfo.name}
        role={elevenLabsInfo.role}
        isFirstTime={elevenLabsInfo.isFirstTime}
        onFallbackToFriede={() => {
          // Fall back to FRIEDE by re-initializing with friede mode
          setInterviewMode('friede');
          setElevenLabsInfo(null);
          updatePhase('pre-interview');
        }}
        onComplete={() => {
          // Reset for new interview
          setInterviewMode('friede');
          setElevenLabsInfo(null);
          updatePhase('pre-interview');
        }}
      />
    );
  }

  // Completed state
  if (state.phase === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-8">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <div>
                <CardTitle className="text-3xl">Interview Complete!</CardTitle>
                <CardDescription>Thank you for your time, {state.candidateName}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {state.feedback && (
              <>
                {/* Overall Score */}
                <div className="text-center p-6 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Overall Score</p>
                  <p className="text-5xl font-bold text-blue-600">{state.feedback.overallScore}</p>
                  <p className="text-sm text-gray-500 mt-2">out of 100</p>
                </div>

                {/* Strengths */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Your Strengths
                  </h3>
                  <ul className="space-y-2">
                    {state.feedback.strengths.map((strength: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-gray-700">
                        <span className="text-green-500 mt-1">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Areas for Improvement */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {state.feedback.improvements.map((improvement: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-gray-700">
                        <span className="text-blue-500 mt-1">→</span>
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Detailed Feedback */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">FRIEDE's Feedback</h3>
                  <p className="text-gray-700 leading-relaxed">{state.feedback.detailedFeedback}</p>
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button onClick={() => navigate('/practice')} className="flex-1">
                Back to Practice Dashboard
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
                Start New Interview
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active interview - 3-column layout

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2">
          <p className="text-red-400 text-sm text-center">{error}</p>
        </div>
      )}

      {/* Main 3-Column Layout */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* LEFT COLUMN - FRIEDE Avatar */}
        <div className="col-span-4 overflow-hidden">
          <FriedeAvatar
            isSpeaking={state.isFriedeSpeaking}
            isListening={state.isListening}
          />
        </div>

        {/* MIDDLE COLUMN - Spacer/Controls */}
        <div className="col-span-1 flex flex-col items-center justify-center gap-4">
          {/* Transcription Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTranscription}
            className="rotate-90"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>

        {/* RIGHT COLUMN - Webcam & Transcription */}
        <div className="col-span-7 flex flex-col gap-4 overflow-hidden">
          {/* Upper Half - Webcam */}
          <div className="flex-1 min-h-0">
            <WebcamPanel proctoring={false} />
          </div>

          {/* Bottom Half - Transcription */}
          {state.showTranscription && (
            <div className="flex-1 min-h-0">
              <TranscriptionPanel
                messages={state.conversationLog}
                show={state.showTranscription}
              />
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isInitializing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto" />
            <p className="text-white text-lg">Initializing FRIEDE...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BotInterview() {
  return (
    <BotInterviewProvider>
      <BotInterviewContent />
    </BotInterviewProvider>
  );
}
