import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  createBotSession,
  getBotIntroduction,
  getFirstTimeFollowUp,
  generateNextQuestion,
  evaluateAnswer,
  handleCandidateQuestion,
  getConclusionMessage,
  speakText,
  stopSpeaking,
  startListening,
  InterviewSession,
  BotMessage
} from '@/utils/botInterviewService';
import { saveBotInterviewResult } from '@/lib/firebaseService';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Volume2, VolumeX, Loader2, CheckCircle, XCircle, Bot, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  role: string;
  isPractice: boolean;
  invitationToken?: string;
}

function BotInterviewer({ role, isPractice }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interviewPhase, setInterviewPhase] = useState<'setup' | 'nameConfirm' | 'loading' | 'intro' | 'firstTime' | 'questions' | 'candidateQuestions' | 'conclusion'>('setup');
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Setup phase states
  const [candidateName, setCandidateName] = useState('');
  const [confirmedName, setConfirmedName] = useState('');
  const [agreedToRules, setAgreedToRules] = useState(false);

  // CRITICAL: Use refs to avoid closure issues in callbacks
  const sessionRef = useRef<InterviewSession | null>(null);
  const phaseRef = useRef<'setup' | 'nameConfirm' | 'loading' | 'intro' | 'firstTime' | 'questions' | 'candidateQuestions' | 'conclusion'>('setup');

  const recognitionRef = useRef<unknown>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Handle name confirmation
  const handleNameSubmit = () => {
    if (candidateName.trim()) {
      setConfirmedName(candidateName.trim());
      setInterviewPhase('nameConfirm');
    }
  };

  const handleNameConfirmation = (isCorrect: boolean) => {
    if (isCorrect) {
      // Stay in nameConfirm phase (show rules and agreement)
      // User will click Start Interview when ready
    } else {
      // Go back to name input
      setCandidateName('');
      setConfirmedName('');
      setInterviewPhase('setup');
    }
  };

  const handleStartInterview = async () => {
    if (!agreedToRules || !confirmedName) return;

    // Create session FIRST before anything else
    const newSession = createBotSession(role, confirmedName);
    setSession(newSession);
    sessionRef.current = newSession; // Set ref immediately
    console.log('✅ Session created:', newSession.sessionId);

    // Initialize webcam when interview starts
    console.log('📹 Starting webcam initialization...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Use onloadedmetadata to ensure video is ready
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log('✅ Webcam playing successfully');
            }).catch(e => {
              console.error('Video play error:', e);
              // Force play again
              setTimeout(() => videoRef.current?.play(), 100);
            });
          }
        };
        console.log('✅ Webcam stream set');
      }
    } catch (err) {
      console.error('❌ Error accessing webcam:', err);
      alert('Please allow camera access to continue with the interview.');
      return; // Don't start interview if camera fails
    }

    setInterviewPhase('loading');

    // Show loading for 3 seconds
    setTimeout(() => {
      try {
        const introduction = getBotIntroduction(confirmedName);

        const introMessage: BotMessage = {
          speaker: 'bot',
          text: introduction,
          timestamp: new Date()
        };

        setMessages([introMessage]);
        setCurrentQuestion(introduction);
        setInterviewPhase('intro');
        phaseRef.current = 'intro'; // Set ref immediately
        console.log('🎬 Interview started - phase: intro, session:', newSession.sessionId);

        // FRIEDE speaks the introduction then auto-starts listening
        if (!isMuted) {
          setIsSpeaking(true);
          speakText(introduction, () => {
            setIsSpeaking(false);
            // Automatically start listening after FRIEDE finishes
            setTimeout(() => {
              startAutoListening();
            }, 500);
          });
        } else {
          setTimeout(() => {
            startAutoListening();
          }, 1000);
        }
      } catch (error) {
        console.error('Error initializing interview:', error);
      }
    }, 3000);
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Don't start webcam here - will start when interview begins

    return () => {
      stopSpeaking();
      if (recognitionRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (recognitionRef.current as any).stop();
      }
      // Stop webcam
      const video = videoRef.current;
      if (video?.srcObject) {
        const tracks = (video.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message: BotMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const startAutoListening = () => {
    if (isSpeaking || isProcessing || phaseRef.current === 'conclusion') return;

    // Prevent starting multiple recognition instances
    if (recognitionRef.current) {
      console.log('⚠️ Recognition already running, skipping...');
      return;
    }

    const textRef = { current: '' };
    let errorCount = 0; // Track consecutive errors

    const recognition = startListening(
      (text) => {
        // When user speaks, capture the text
        textRef.current = text;
        setUserInput(text);
        console.log('📝 Capturing:', text);
        errorCount = 0; // Reset error count on successful recognition
      },
      () => {
        // When listening ends, automatically process the answer
        console.log('🎤 Recognition ended, captured text:', textRef.current);
        setIsListening(false);
        recognitionRef.current = null; // Clear ref
        const finalText = textRef.current.trim();
        if (finalText) {
          console.log('✅ Submitting answer:', finalText);
          // Submit the captured text
          setTimeout(() => {
            submitAnswerWithText(finalText);
          }, 100);
        } else {
          console.log('⚠️ No text captured, restarting listening...');
          // Only restart if not too many errors
          if (errorCount < 5) {
            setTimeout(() => startAutoListening(), 500);
          } else {
            console.error('❌ Too many recognition failures, stopping...');
          }
        }
      },
      (error) => {
        console.error('❌ Recognition error:', error);
        setIsListening(false);
        recognitionRef.current = null; // Clear ref
        errorCount++;

        // Only retry if not too many consecutive errors
        if (errorCount < 5) {
          setTimeout(() => {
            if (!isSpeaking && !isProcessing && phaseRef.current !== 'conclusion') {
              startAutoListening();
            }
          }, 1000);
        } else {
          console.error('❌ Too many consecutive errors, stopping auto-listening');
        }
      }
    );

    if (recognition) {
      recognitionRef.current = recognition;
      setIsListening(true);
    }
  };

  const handleStartListening = () => {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    }

    const recognition = startListening(
      (text) => {
        setUserInput(text);
      },
      () => {
        setIsListening(false);
      },
      (error) => {
        console.error('Recognition error:', error);
        setIsListening(false);
      }
    );

    if (recognition) {
      recognitionRef.current = recognition;
      setIsListening(true);
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any).stop();
    }
    setIsListening(false);
  };

  const submitAnswerWithText = async (answer: string) => {
    console.log('🟢 submitAnswerWithText called with:', answer);
    console.log('🟢 Current phase (state):', interviewPhase);
    console.log('🟢 Current phase (ref):', phaseRef.current);
    console.log('🟢 Is processing:', isProcessing);
    console.log('🟢 Session exists (state):', !!session);
    console.log('🟢 Session exists (ref):', !!sessionRef.current);
    console.log('🟢 Session details:', sessionRef.current ? { id: sessionRef.current.sessionId, phase: phaseRef.current, index: sessionRef.current.currentQuestionIndex } : 'NULL');

    // Use REF values, not state values (to avoid closure issues)
    if (!answer.trim() || !sessionRef.current || isProcessing) {
      console.log('⚠️ Rejected submission:', { emptyAnswer: !answer.trim(), noSession: !sessionRef.current, isProcessing });
      return;
    }

    const userMessage: BotMessage = {
      speaker: 'user',
      text: answer,
      timestamp: new Date()
    };
    addMessage(userMessage);
    console.log('✅ User message added to transcript');

    setUserInput('');
    setIsProcessing(true);
    console.log('🔵 Processing started...');

    try {
      if (phaseRef.current === 'intro') {
        console.log('🟠 Phase: INTRO - Checking if first time...');
        // User responded to intro, check if first time
        const isFirstTime = answer.toLowerCase().includes('yes') ||
          answer.toLowerCase().includes('first') ||
          !answer.toLowerCase().includes('no');

        console.log('🟠 Is first time:', isFirstTime);
        const followUp = getFirstTimeFollowUp(isFirstTime);
        console.log('🟠 Follow-up generated:', followUp.substring(0, 50) + '...');

        const botMessage: BotMessage = {
          speaker: 'bot',
          text: followUp,
          timestamp: new Date()
        };
        addMessage(botMessage);
        setCurrentQuestion(followUp);
        console.log('✅ Bot message added');

        if (!isMuted) {
          setIsSpeaking(true);
          speakText(followUp, () => {
            setIsSpeaking(false);
            // Auto-start listening after FRIEDE finishes
            setTimeout(() => startAutoListening(), 500);
          });
        } else {
          setTimeout(() => startAutoListening(), 500);
        }

        setSession({ ...sessionRef.current!, isFirstTime });
        sessionRef.current = { ...sessionRef.current!, isFirstTime };
        setInterviewPhase('firstTime');
        phaseRef.current = 'firstTime';
        console.log('✅ Phase changed to firstTime');

      } else if (phaseRef.current === 'firstTime') {
        console.log('🟡 Phase: FIRST TIME - Evaluating answer...');
        // User answered "tell me about yourself"
        const evaluation = await evaluateAnswer(answer, currentQuestion, sessionRef.current!);
        console.log('✅ Evaluation received:', evaluation);

        const botMessage: BotMessage = {
          speaker: 'bot',
          text: evaluation.response,
          timestamp: new Date()
        };
        addMessage(botMessage);

        // Update session first
        const updatedSession = { ...sessionRef.current! };
        updatedSession.transcript.push(userMessage);
        updatedSession.currentQuestionIndex = 1;

        setSession(updatedSession);
        sessionRef.current = updatedSession;
        setInterviewPhase('questions');
        phaseRef.current = 'questions';

        if (!isMuted) {
          setIsSpeaking(true);
          speakText(evaluation.response, async () => {
            setIsSpeaking(false);

            // NOW generate and speak the question AFTER evaluation response finishes
            const previousMessages = updatedSession.transcript.filter(m => m.speaker === 'user');
            const nextQuestion = await generateNextQuestion(updatedSession, previousMessages);
            const questionMessage: BotMessage = {
              speaker: 'bot',
              text: nextQuestion,
              timestamp: new Date()
            };
            addMessage(questionMessage);
            setCurrentQuestion(nextQuestion);

            // Speak the question
            setIsSpeaking(true);
            speakText(nextQuestion, () => {
              setIsSpeaking(false);
              setTimeout(() => startAutoListening(), 500);
            });
          });
        } else {
          // If muted, generate question immediately
          const previousMessages = updatedSession.transcript.filter(m => m.speaker === 'user');
          const nextQuestion = await generateNextQuestion(updatedSession, previousMessages);
          const questionMessage: BotMessage = {
            speaker: 'bot',
            text: nextQuestion,
            timestamp: new Date()
          };
          addMessage(questionMessage);
          setCurrentQuestion(nextQuestion);
          setTimeout(() => startAutoListening(), 500);
        }

      } else if (phaseRef.current === 'questions') {
        // Main interview questions
        const evaluation = await evaluateAnswer(answer, currentQuestion, sessionRef.current!);

        const evalMessage: BotMessage = {
          speaker: 'bot',
          text: evaluation.response,
          timestamp: new Date(),
          evaluation: {
            clarity: evaluation.clarity,
            relevance: evaluation.relevance,
            depth: evaluation.depth,
            needsFollowUp: false
          }
        };
        addMessage(evalMessage);

        if (!isMuted) {
          setIsSpeaking(true);
          speakText(evaluation.response, () => {
            setIsSpeaking(false);
            setTimeout(() => startAutoListening(), 500);
          });
        } else {
          setTimeout(() => startAutoListening(), 500);
        }

        // Update session
        const updatedSession = { ...sessionRef.current! };
        updatedSession.transcript.push(userMessage);
        updatedSession.transcript.push(evalMessage);
        updatedSession.currentQuestionIndex++;

        // Update performance
        const avgScore = (evaluation.clarity + evaluation.relevance + evaluation.depth) / 3;
        if (avgScore >= 8) updatedSession.overallPerformance = 'excellent';
        else if (avgScore >= 6) updatedSession.overallPerformance = 'good';
        else if (avgScore >= 4) updatedSession.overallPerformance = 'average';
        else updatedSession.overallPerformance = 'poor';

        setSession(updatedSession);
        sessionRef.current = updatedSession;

        // Check if we should continue or move to candidate questions
        if (updatedSession.currentQuestionIndex >= updatedSession.questionCount) {
          setInterviewPhase('candidateQuestions');
          phaseRef.current = 'candidateQuestions';

          const candidatePrompt = "Thank you for your answers! Now, do you have any questions for me about the role, team, or company?";
          const promptMessage: BotMessage = {
            speaker: 'bot',
            text: candidatePrompt,
            timestamp: new Date()
          };
          addMessage(promptMessage);
          setCurrentQuestion(candidatePrompt);

          if (!isMuted) {
            setIsSpeaking(true);
            speakText(candidatePrompt, () => {
              setIsSpeaking(false);
              setTimeout(() => startAutoListening(), 500);
            });
          } else {
            setTimeout(() => startAutoListening(), 500);
          }
        } else {
          // Generate next question
          const previousMessages = updatedSession.transcript.filter(m => m.speaker === 'user');

          const nextQuestion = await generateNextQuestion(updatedSession, previousMessages);
          const questionMessage: BotMessage = {
            speaker: 'bot',
            text: nextQuestion,
            timestamp: new Date()
          };
          addMessage(questionMessage);
          setCurrentQuestion(nextQuestion);

          if (!isMuted) {
            setIsSpeaking(true);
            speakText(nextQuestion, () => {
              setIsSpeaking(false);
              setTimeout(() => startAutoListening(), 500);
            });
          } else {
            setTimeout(() => startAutoListening(), 500);
          }
        }

      } else if (phaseRef.current === 'candidateQuestions') {
        // Handle candidate's questions
        const response = await handleCandidateQuestion(answer, sessionRef.current!);
        const responseMessage: BotMessage = {
          speaker: 'bot',
          text: response,
          timestamp: new Date()
        };
        addMessage(responseMessage);

        if (!isMuted) {
          setIsSpeaking(true);
          speakText(response, () => {
            setIsSpeaking(false);

            // After answering, ask if they have more questions
            const moreQuestionsPrompt = "Do you have any other questions?";
            const moreMessage: BotMessage = {
              speaker: 'bot',
              text: moreQuestionsPrompt,
              timestamp: new Date()
            };
            addMessage(moreMessage);

            if (!isMuted) {
              speakText(moreQuestionsPrompt, () => {
                setIsSpeaking(false);
                setTimeout(() => startAutoListening(), 500);
              });
            } else {
              setTimeout(() => startAutoListening(), 500);
            }
          });
        }

        // Check if user wants to end
        const wantsToEnd = answer.toLowerCase().includes('no') ||
          answer.toLowerCase().includes('that') ||
          answer.toLowerCase().includes('all');

        if (wantsToEnd) {
          await handleInterviewConclusion();
        }
      }

      setIsProcessing(false);
      console.log('✅ Processing complete, isProcessing set to false');
    } catch (error) {
      console.error('❌ ERROR IN submitAnswerWithText:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ Current phase:', interviewPhase);
      setIsProcessing(false);
      // Retry listening after error
      setTimeout(() => startAutoListening(), 1000);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userInput.trim() || !session || isProcessing) return;
    await submitAnswerWithText(userInput);
  };

  const handleInterviewConclusion = async () => {
    if (!session) return;

    setInterviewPhase('conclusion');
    phaseRef.current = 'conclusion';

    const conclusionMsg = getConclusionMessage(session);
    const conclusionMessage: BotMessage = {
      speaker: 'bot',
      text: conclusionMsg,
      timestamp: new Date()
    };
    addMessage(conclusionMessage);
    setCurrentQuestion(conclusionMsg);

    if (!isMuted) {
      setIsSpeaking(true);
      speakText(conclusionMsg, () => {
        setIsSpeaking(false);
      });
    }

    // Save to database via REST API
    try {
      const interviewData = {
        candidateName: confirmedName,
        role: session.role,
        conversationLog: messages,
        feedback: {
          overallPerformance: session.overallPerformance,
          questionCount: session.questionCount,
          isPractice,
        },
      };

      await saveBotInterviewResult(interviewData, user?.id || '');
      console.log('✅ Bot interview saved successfully');

      // Navigate after 5 seconds
      setTimeout(() => {
        navigate(isPractice ? '/practice' : '/summary');
      }, 5000);

    } catch (error) {
      console.error('❌ Error saving interview:', error);
    }
  };

  // Setup Phase
  if (interviewPhase === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6 flex items-center justify-center">
        <Card className="p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bot className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Welcome to FRIEDE Bot Interview</h2>
            <p className="text-gray-600">Let's get you set up before we begin</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Please enter your name:</label>
              <Input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Your full name"
                className="text-center text-lg"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleNameSubmit();
                }}
              />
            </div>

            <Button
              onClick={handleNameSubmit}
              disabled={!candidateName.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600"
            >
              Confirm Name
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Name Confirmation & Rules Phase
  if (interviewPhase === 'nameConfirm') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6">
        <Card className="p-8 max-w-3xl mx-auto space-y-6">
          {/* Name Confirmation */}
          <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <p className="text-lg mb-4">
              Is your name <span className="font-bold text-purple-600">{confirmedName}</span> correct?
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => handleNameConfirmation(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Yes, that's correct
              </Button>
              <Button
                onClick={() => handleNameConfirmation(false)}
                variant="outline"
              >
                <XCircle className="h-4 w-4 mr-2" />
                No, let me re-enter
              </Button>
            </div>
          </div>

          {/* Interview Guidelines */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* DO's */}
            <div className="p-6 bg-green-50 rounded-lg border-2 border-green-200">
              <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                DO's
              </h3>
              <ul className="space-y-2 text-sm text-green-900">
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  Speak clearly and at a moderate pace
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  Find a quiet place with good internet
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  Answer questions honestly and thoughtfully
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  Take your time to think before responding
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✓</span>
                  Use specific examples from your experience
                </li>
              </ul>
            </div>

            {/* DON'Ts */}
            <div className="p-6 bg-red-50 rounded-lg border-2 border-red-200">
              <h3 className="text-lg font-bold text-red-800 mb-4 flex items-center">
                <XCircle className="h-5 w-5 mr-2" />
                DON'Ts
              </h3>
              <ul className="space-y-2 text-sm text-red-900">
                <li className="flex items-start">
                  <span className="mr-2">✗</span>
                  Use AI tools or external assistance
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✗</span>
                  Give generic or rehearsed answers
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✗</span>
                  Interrupt FRIEDE while speaking
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✗</span>
                  Use offensive or inappropriate language
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✗</span>
                  Ask about how FRIEDE was built or its code
                </li>
              </ul>
            </div>
          </div>

          {/* Agreement Checkbox */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <label className="flex items-start space-x-3 cursor-pointer">
              <Checkbox
                checked={agreedToRules}
                onCheckedChange={(checked) => setAgreedToRules(checked as boolean)}
              />
              <span className="text-sm text-gray-700">
                I agree to the interview guidelines and will conduct myself professionally throughout the interview. I understand that FRIEDE will evaluate my responses based on clarity, relevance, and depth.
              </span>
            </label>
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStartInterview}
            disabled={!agreedToRules}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-lg py-6"
          >
            Start Interview with FRIEDE
          </Button>
        </Card>
      </div>
    );
  }

  // Loading Phase
  if (interviewPhase === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-6 flex items-center justify-center">
        <Card className="p-12 max-w-2xl w-full">
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="h-12 w-12 text-white animate-spin" />
            </div>
            <h2 className="text-2xl font-bold">Preparing Your Interview...</h2>
            <p className="text-gray-600">FRIEDE is getting ready to meet you, {confirmedName}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              FRIEDE - AI Interviewer
            </h1>
            <p className="text-gray-600 text-sm">
              {role} Interview {isPractice && '(Practice Mode)'}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setIsMuted(!isMuted);
              if (!isMuted) stopSpeaking();
            }}
          >
            {isMuted ? <VolumeX className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
            {isMuted ? 'Unmute' : 'Mute'} FRIEDE
          </Button>
        </div>

        {/* 3-Box Layout */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Box 1: FRIEDE Bot Display */}}
          <Card className="p-6 flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100">
            <div className="w-32 h-32 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <span className="text-4xl font-bold text-white">FRIEDE</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Interviewer</h3>

            {/* Status Indicators */}
            {isSpeaking && (
              <Badge className="bg-green-500 animate-pulse mb-2">
                <Volume2 className="h-3 w-3 mr-1" />
                Speaking...
              </Badge>
            )}
            {isListening && (
              <Badge className="bg-blue-500 animate-pulse mb-2">
                Listening...
              </Badge>
            )}
            {isProcessing && (
              <Badge className="bg-yellow-500 mb-2">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processing...
              </Badge>
            )}

            {/* Current Question Display */}
            {currentQuestion && (
              <div className="mt-4 p-4 bg-white rounded-lg w-full">
                <p className="text-xs text-gray-500 mb-2">Current Question:</p>
                <p className="text-sm text-gray-800">{currentQuestion}</p>
              </div>
            )}
          </Card>

          {/* Box 2: User Webcam */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold mb-3">Your Video</h3>
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                controls={false}
                className="w-full h-full object-cover transform -scale-x-100"
                style={{ backgroundColor: '#000', minHeight: '300px' }}
              />
            </div>
          </Card>

          {/* Box 3: Transcript (Toggle) */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold">Interview Transcript</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowTranscript(!showTranscript)}
              >
                {showTranscript ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            {showTranscript ? (
              <div className="h-[400px] overflow-y-auto space-y-3">
                <AnimatePresence>
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg ${msg.speaker === 'user'
                          ? 'bg-purple-100 ml-4'
                          : 'bg-gray-100 mr-4'
                        }`}
                    >
                      <p className="text-xs font-semibold mb-1">
                        {msg.speaker === 'user' ? confirmedName : 'FRIEDE'}
                      </p>
                      <p className="text-sm">{msg.text}</p>
                      {msg.evaluation && (
                        <div className="mt-2 flex gap-1 text-xs">
                          <Badge variant="secondary">C:{msg.evaluation.clarity}</Badge>
                          <Badge variant="secondary">R:{msg.evaluation.relevance}</Badge>
                          <Badge variant="secondary">D:{msg.evaluation.depth}</Badge>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Transcript hidden</p>
                  <p className="text-xs">Click the eye icon to show</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default BotInterviewer;
