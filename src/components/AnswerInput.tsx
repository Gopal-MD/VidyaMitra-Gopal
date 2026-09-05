
import { useState, useEffect, KeyboardEvent, useCallback, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Save, Mic, MicOff, AlertTriangle } from "lucide-react";
import { useInterview } from "@/contexts/InterviewContext";
import { isIrrelevantAnswer } from "@/utils/interviewUtils";
import { detectAIGeneratedAdvanced, AIDetectionResult } from "@/utils/aiDetection";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

// Define the SpeechRecognition interfaces
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionError extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionError) => void;
  onend: () => void;
  onstart: () => void;
  onspeechend: () => void;
  onaudiostart: () => void;
  onaudioend: () => void;
  onnomatch: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

const AnswerInput = () => {
  const { 
    saveAnswer, 
    nextQuestion, 
    previousQuestion, 
    getCurrentAnswer,
    currentQuestionIndex,
    currentInterview,
    completeInterview
  } = useInterview();
  
  const { toast } = useToast();
  const [answerText, setAnswerText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechAvailable, setSpeechAvailable] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognitionInstance | null>(null);
  const [irrelevantWarningShown, setIrrelevantWarningShown] = useState(false);
  const [voiceRecognitionError, setVoiceRecognitionError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState("");
  
  // Reference to the text area element for cursor position management
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionTimeoutRef = useRef<number | null>(null);
  
  // Check if SpeechRecognition is available
  useEffect(() => {
    const checkSpeechAvailability = () => {
      const SpeechRecognitionAPI = 
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition;
      
      return !!SpeechRecognitionAPI;
    };
    
    setSpeechAvailable(checkSpeechAvailability());
  }, []);
  
  // Initialize speech recognition
  useEffect(() => {
    if (speechAvailable) {
      // Use the appropriate SpeechRecognition constructor
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        const recognitionInstance = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
        
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = "en-US";
        recognitionInstance.maxAlternatives = 1;
        
        recognitionInstance.onstart = () => {
          console.log("Voice recognition started");
          setIsListening(true);
          setVoiceRecognitionError(null);
        };
        
        recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
          let current = '';
          let isFinal = false;
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
            isFinal = event.results[i].isFinal;
          }
          
          // Handle interim results
          if (!isFinal) {
            setInterimTranscript(current);
          } else {
            // Final result - append to answer text at current cursor position
            setInterimTranscript("");
            
            // Insert at current cursor position or append to end
            if (textareaRef.current) {
              const cursorPos = textareaRef.current.selectionStart;
              const textBefore = answerText.substring(0, cursorPos);
              const textAfter = answerText.substring(cursorPos);
              
              // Clean up the transcript by trimming and ensuring spacing
              let transcript = current.trim();
              
              // Ensure proper spacing when inserting into existing text
              if (textBefore && !textBefore.endsWith(' ') && transcript) {
                transcript = ' ' + transcript;
              }
              if (textAfter && !textAfter.startsWith(' ') && transcript) {
                transcript = transcript + ' ';
              }
              
              const newText = textBefore + transcript + textAfter;
              setAnswerText(newText);
              
              // Move cursor to end of inserted text
              setTimeout(() => {
                if (textareaRef.current) {
                  const newCursorPos = textBefore.length + transcript.length;
                  textareaRef.current.focus();
                  textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
              }, 10);
            } else {
              // Fallback: just append to end if textareaRef isn't available
              setAnswerText(prev => {
                if (prev && !prev.endsWith(' ') && current) {
                  return prev + ' ' + current.trim();
                }
                return prev + current.trim();
              });
            }
            
            setVoiceRecognitionError(null);
          }
        };
        
        recognitionInstance.onerror = (event: SpeechRecognitionError) => {
          console.error('Speech recognition error', event.error, event.message);
          
          let errorMessage = "Sorry, voice not recognized clearly. Please try again.";
          
          if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            errorMessage = "🚫 Please allow microphone access to use voice input.";
          } else if (event.error === 'no-speech') {
            errorMessage = "⚠️ No speech detected. Please try again in a quieter environment.";
          } else if (event.error === 'network') {
            errorMessage = "Network error occurred. Please check your connection.";
          }
          
          setVoiceRecognitionError(errorMessage);
          setIsListening(false);
          setIsRecording(false);
          setInterimTranscript("");
          
          toast({
            title: "Voice Recognition Error",
            description: errorMessage,
            variant: "destructive",
          });
        };
        
        recognitionInstance.onend = () => {
          console.log("Voice recognition ended");
          setIsListening(false);
          setInterimTranscript("");
          
          // Check if we were still supposed to be listening
          if (isRecording) {
            setIsRecording(false);
          }
        };
        
        recognitionInstance.onspeechend = () => {
          console.log("Speech ended");
          // Automatically end after speech is done
          setTimeout(() => {
            if (recognition) {
              recognition.stop();
            }
          }, 1000);
        };
        
        recognitionInstance.onnomatch = () => {
          setVoiceRecognitionError("⚠️ Could not recognize your speech. Please try again.");
          setIsListening(false);
        };
        
        setRecognition(recognitionInstance);
      }
    }
  }, [speechAvailable, toast]);
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognition) {
        recognition.abort();
      }
      if (recognitionTimeoutRef.current) {
        window.clearTimeout(recognitionTimeoutRef.current);
      }
    };
  }, [recognition]);
  
  // Load existing answer if available
  useEffect(() => {
    const currentAnswer = getCurrentAnswer();
    if (currentAnswer) {
      setAnswerText(currentAnswer.text);
      setIrrelevantWarningShown(false);
    } else {
      setAnswerText("");
      setIrrelevantWarningShown(false);
    }
    setVoiceRecognitionError(null);
    setInterimTranscript("");
  }, [currentQuestionIndex, getCurrentAnswer]);
  
  const handleSaveAnswer = useCallback(async () => {
    if (answerText.trim()) {
      // Check for irrelevant answers
      const isIrrelevant = isIrrelevantAnswer(answerText.trim());
      
      if (isIrrelevant && !irrelevantWarningShown) {
        toast({
          title: "Your answer may be incomplete",
          description: "Please provide a more detailed, relevant answer to the question.",
          variant: "destructive",
        });
        setIrrelevantWarningShown(true);
      }
      
      // Silently detect AI-generated content
      const aiResult = detectAIGeneratedAdvanced(answerText);
      await saveAnswer(answerText.trim(), aiResult.isAIGenerated);
    }
  }, [answerText, irrelevantWarningShown, saveAnswer, toast]);
  
  // Calculate if this is the last question
  const isLastQuestion = currentInterview && 
    currentQuestionIndex === currentInterview.questions.length - 1;
  
  const handleNext = useCallback(async () => {
    if (answerText.trim()) {
      // Check for irrelevant answers
      const isIrrelevant = isIrrelevantAnswer(answerText.trim());
      
      if (isIrrelevant && !irrelevantWarningShown) {
        toast({
          title: "Your answer may be incomplete",
          description: "Please provide a more detailed, relevant answer to the question.",
          variant: "destructive",
        });
        setIrrelevantWarningShown(true);
      }
      
      // Silently detect AI-generated content
      const aiResult = detectAIGeneratedAdvanced(answerText);
      await saveAnswer(answerText.trim(), aiResult.isAIGenerated);
    }
    
    // Check if this is the last question
    if (isLastQuestion) {
      completeInterview();
    } else {
      nextQuestion();
    }
  }, [answerText, irrelevantWarningShown, saveAnswer, nextQuestion, completeInterview, isLastQuestion, toast]);
  
  const toggleSpeechRecognition = useCallback(() => {
    if (!recognition) {
      toast({
        title: "Voice Recognition Not Available",
        description: "Your browser doesn't support voice recognition.",
        variant: "destructive",
      });
      return;
    }
    
    if (isRecording || isListening) {
      // Stop current recognition
      recognition.stop();
      setIsRecording(false);
      setIsListening(false);
      setInterimTranscript("");
      
      if (recognitionTimeoutRef.current) {
        window.clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
    } else {
      // Clear previous error
      setVoiceRecognitionError(null);
      setInterimTranscript("");
      
      // Set loading state immediately
      setIsRecording(true);
      
      // Start new recording with a slight delay
      // This helps prevent overlapping recognitions
      recognitionTimeoutRef.current = window.setTimeout(() => {
        try {
          // Make sure any previous sessions are fully stopped
          recognition.abort();
          
          // Start new session
          recognition.start();
          
          toast({
            title: "Listening...",
            description: "Speak clearly into your microphone.",
          });
        } catch (error) {
          console.error("Error starting speech recognition:", error);
          setVoiceRecognitionError("Could not access microphone. Please check your browser permissions.");
          setIsRecording(false);
          
          toast({
            title: "Microphone Error",
            description: "Could not access microphone. Please check your browser permissions.",
            variant: "destructive",
          });
        }
      }, 200);
    }
  }, [recognition, isRecording, isListening, toast]);
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  };
  
  // Handle text change without character deletion issues
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setAnswerText(newValue);
  };
  
  return (
    <div className="space-y-4">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          placeholder="Type your answer here... (Press SHIFT+ENTER for new line, ENTER to submit)"
          className="min-h-[150px]"
          value={answerText}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
        />
        
        {interimTranscript && (
          <div className="absolute bottom-2 right-2 bg-primary/10 text-primary px-2 py-1 rounded text-sm animate-pulse">
            {interimTranscript}...
          </div>
        )}
      </div>
      
      {voiceRecognitionError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{voiceRecognitionError}</AlertDescription>
        </Alert>
      )}
      
      {isListening && (
        <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 p-2 rounded border border-primary/20">
          <div className="animate-pulse">
            <Mic className="h-4 w-4" />
          </div>
          <span>Listening... Speak clearly into your microphone.</span>
        </div>
      )}
      
      {irrelevantWarningShown && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          <AlertTriangle className="h-4 w-4" />
          <span>Your answer seems incomplete or generic. Please provide a more detailed response.</span>
        </div>
      )}
      
      <div className="flex flex-wrap gap-3 justify-between">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={previousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleSaveAnswer}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          
          {speechAvailable && (
            <Button
              variant={isRecording ? "destructive" : "outline"}
              onClick={toggleSpeechRecognition}
              className={isRecording ? "animate-pulse" : ""}
              disabled={isListening && !isRecording}
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  {isListening ? "Processing..." : "Start Recording"}
                </>
              )}
            </Button>
          )}
        </div>
        
        <Button 
          onClick={handleNext}
          disabled={!answerText.trim()}
        >
          {isLastQuestion ? "Finish" : "Next"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default AnswerInput;
