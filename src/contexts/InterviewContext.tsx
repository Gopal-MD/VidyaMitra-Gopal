
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { 
  InterviewSession, 
  Question, 
  Answer, 
  Feedback,
  JobRole,
  ResumeData,
  getInterviewOutcome
} from "@/types";
import { 
  createInterviewSession, 
  generateFeedback,
  generateBatchFeedback, 
  calculateScore, 
  generateOverallFeedback,
  saveInterviewToLocalStorage,
  getInterviewFromLocalStorage,
  jobRoles,
  getRandomQuestionsForRole
} from "@/utils/interviewUtils";
import { useToast } from "@/components/ui/use-toast";
import { sendSelectionEmail } from "@/utils/emailUtils";
import { useAuth } from "@/contexts/AuthContext";
import { 
  saveInterview, 
  getInterview, 
  getUserInterviews, 
  updateInterview 
} from "@/lib/firebaseService";
import { logActivity } from "@/utils/profileService";

interface InterviewContextType {
  currentInterview: InterviewSession | null;
  currentQuestionIndex: number;
  timerEnabled: boolean;
  isLoading: boolean;
  startInterview: (roleId: string, resumeData?: ResumeData, isMonitored?: boolean, roundInfo?: { round: number; aptitudeRoundId?: string }) => Promise<void>;
  saveAnswer: (text: string, isAIGenerated?: boolean) => Promise<void>;
  nextQuestion: () => void;
  previousQuestion: () => void;
  completeInterview: () => void;
  resetInterview: () => void;
  toggleTimer: () => void;
  getCurrentQuestion: () => Question | null;
  getCurrentAnswer: () => Answer | null;
  getProgressPercentage: () => number;
  selectedRole: JobRole | null;
  sendSelectionEmailToUser: (interviewId: string) => Promise<boolean>;
  markInterviewAsSelected: (interviewId: string) => void;
  abortInterview: (interviewId: string, reason: string) => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export const InterviewProvider = ({ children }: { children: ReactNode }) => {
  const [currentInterview, setCurrentInterview] = useState<InterviewSession | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<JobRole | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Check for ongoing interview in Firestore on mount
  useEffect(() => {
    const loadOngoingInterview = async () => {
      if (!user) return;
      
      const savedInterviewId = localStorage.getItem('mockmate-current-interview');
      if (savedInterviewId) {
        try {
          const savedInterview = await getInterview(savedInterviewId);
          if (savedInterview && !savedInterview.completed && savedInterview.userId === user.id) {
            setCurrentInterview(savedInterview);
            // Find the index of the first unanswered question
            const lastAnsweredIndex = savedInterview.answers.length - 1;
            setCurrentQuestionIndex(lastAnsweredIndex + 1 < savedInterview.questions.length ? lastAnsweredIndex + 1 : 0);
            
            // Set selected role
            const role = jobRoles.find(r => r.id === savedInterview.roleId);
            if (role) setSelectedRole(role);
            
            toast({
              title: "Interview Resumed",
              description: `Continuing your ${savedInterview.roleName} interview.`,
            });
          }
        } catch (error) {
          console.error('Error loading interview:', error);
          localStorage.removeItem('mockmate-current-interview');
        }
      }
    };
    
    loadOngoingInterview();
  }, [user]);

  // Save current interview to Firestore when it changes
  useEffect(() => {
    const saveCurrentInterview = async () => {
      if (currentInterview && user) {
        try {
          localStorage.setItem('mockmate-current-interview', currentInterview.id);
          
          // Only save to main interviews collection if it's a monitored (formal) interview
          // Practice interviews should be saved via savePracticeInterviewResult instead
          if (!currentInterview.isPracticeMode) {
            console.log('💾 Auto-saving formal interview to main collection');
            await saveInterview(currentInterview, user.id);
          } else {
            console.log('⏭️ Skipping auto-save for practice interview (will be saved on completion)');
            // Just save to localStorage for practice sessions
            saveInterviewToLocalStorage(currentInterview);
          }
        } catch (error) {
          console.error('Error saving interview:', error);
          // Fallback to localStorage
          saveInterviewToLocalStorage(currentInterview);
        }
      } else {
        localStorage.removeItem('mockmate-current-interview');
      }
    };
    
    saveCurrentInterview();
  }, [currentInterview, user]);

  const startInterview = async (roleId: string, resumeData?: ResumeData, isMonitored: boolean = true, roundInfo?: { round: number; aptitudeRoundId?: string }) => {
    setIsLoading(true);
    try {
      toast({
        title: !isMonitored ? "Starting Practice Session" : (roundInfo?.round === 2 ? "Starting Round 2 Interview" : "Starting Formal Interview"),
        description: !isMonitored 
          ? "AI is generating practice questions for you..."
          : (roundInfo?.round === 2 ? "AI is creating Round 2 mock interview questions..." : "AI is creating personalized questions for your interview..."),
      });
      
      const newInterview = await createInterviewSession(roleId, user?.email, isMonitored);
      
      // Use provided resume data or check session storage
      if (resumeData) {
        newInterview.resume = resumeData;
      } else {
        const pendingResumeData = sessionStorage.getItem('pendingResume');
        if (pendingResumeData) {
          try {
            const resume = JSON.parse(pendingResumeData);
            newInterview.resume = resume;
            sessionStorage.removeItem('pendingResume');
          } catch (e) {
            console.error('Failed to parse resume data:', e);
          }
        }
      }
      
      // Mark as practice mode if not monitored
      if (!isMonitored) {
        newInterview.isPracticeMode = true;
      }
      
      // Set round information for multi-round interviews
      if (roundInfo) {
        newInterview.round = roundInfo.round;
        if (roundInfo.aptitudeRoundId) {
          newInterview.aptitudeRoundId = roundInfo.aptitudeRoundId;
          newInterview.selectedForRound2 = true; // Mark as selected since they're starting Round 2
        }
        console.log('🎬 Set round info:', { round: roundInfo.round, aptitudeRoundId: roundInfo.aptitudeRoundId });
      }
      
      setCurrentInterview(newInterview);
      setCurrentQuestionIndex(0);
      
      // Set selected role
      const role = jobRoles.find(r => r.id === roleId);
      if (role) setSelectedRole(role);
      
      toast({
        title: "Interview Ready",
        description: `AI-generated questions ready for your ${newInterview.roleName} interview.`,
      });
    } catch (error) {
      console.error("Error starting interview:", error);
      toast({
        title: "Error",
        description: "Could not start the interview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAnswer = async (text: string, isAIGenerated: boolean = false) => {
    if (!currentInterview) return;
    
    setIsLoading(true);
    
    try {
      toast({
        title: "Analyzing Answer",
        description: "AI is evaluating your response...",
      });
      
      const currentQuestion = currentInterview.questions[currentQuestionIndex];
      
      // Generate AI-powered feedback for the answer
      const feedback = await generateFeedback(currentQuestion.text, text, isAIGenerated);
      
      // Create answer object
      const answer: Answer = {
        questionId: currentQuestion.id,
        text,
        feedback
      };
      
      // Update the answers array
      const updatedAnswers = [...currentInterview.answers];
      const existingAnswerIndex = updatedAnswers.findIndex(
        a => a.questionId === answer.questionId
      );
      
      if (existingAnswerIndex >= 0) {
        updatedAnswers[existingAnswerIndex] = answer;
      } else {
        updatedAnswers.push(answer);
      }
      
      // Track AI detection count
      let aiDetectionCount = currentInterview.aiDetectionCount || 0;
      if (isAIGenerated || (feedback.possiblyAI && feedback.overall <= 5)) {
        aiDetectionCount++;
      }
      
      toast({
        title: "Answer Evaluated",
        description: `Score: ${feedback.overall.toFixed(1)}/10 - AI feedback generated!`,
      });
      
      // Update current interview
      setCurrentInterview({
        ...currentInterview,
        answers: updatedAnswers,
        aiDetectionCount
      });
      
      toast({
        title: "Answer Saved",
        description: "Your answer has been saved and feedback generated.",
      });
    } catch (error) {
      console.error("Error saving answer:", error);
      toast({
        title: "Error",
        description: "Could not save your answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const nextQuestion = () => {
    if (!currentInterview) return;
    
    if (currentQuestionIndex < currentInterview.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // If this is the last question, prompt to complete
      toast({
        title: "Last Question",
        description: "This is the last question. Complete your interview when ready.",
      });
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const completeInterview = async () => {
    if (!currentInterview || !user) return;
    
    setIsLoading(true);
    
    try {
      console.log('🎯 Completing interview...');
      
      // ============= BATCH EVALUATION OPTIMIZATION =============
      // Check for any answers without feedback and batch evaluate them
      const answersWithoutFeedback = currentInterview.answers.filter(a => !a.feedback);
      
      if (answersWithoutFeedback.length > 0) {
        console.log(`🚀 Found ${answersWithoutFeedback.length} answers without feedback - batch evaluating...`);
        
        // Prepare batch input
        const batchInput = answersWithoutFeedback.map(answer => {
          const question = currentInterview.questions.find(q => q.id === answer.questionId);
          return {
            question: question?.text || '',
            answerText: answer.text,
            isAIGenerated: answer.possiblyAI || false
          };
        });
        
        // Batch evaluate all at once (1 API call instead of N calls!)
        const feedbacks = await generateBatchFeedback(batchInput);
        console.log(`✅ Batch evaluation complete: ${feedbacks.length} feedbacks generated in 1 API call`);
        
        // Update answers with feedback
        const updatedAnswers = currentInterview.answers.map(answer => {
          if (!answer.feedback) {
            const index = answersWithoutFeedback.findIndex(a => a.questionId === answer.questionId);
            if (index !== -1) {
              return { ...answer, feedback: feedbacks[index] };
            }
          }
          return answer;
        });
        
        // Update interview with new feedback
        currentInterview.answers = updatedAnswers;
      } else {
        console.log('✅ All answers already have feedback');
      }
      // ============= END BATCH EVALUATION =============
      
      // Calculate final score
      const score = calculateScore(currentInterview.answers, currentInterview.aiDetectionCount || 0);
      
      // Generate overall feedback
      const feedback = generateOverallFeedback(score, currentInterview.aiDetectionCount || 0);
      
      // Update current interview
      const completedInterview: InterviewSession = {
        ...currentInterview,
        completed: true,
        score,
        feedback,
        selected: false,
        messageGenerated: false,
        endTime: new Date().toISOString()
      };
      
      // Save to Firestore only for monitored (formal) interviews
      // Practice interviews are saved separately via savePracticeInterviewResult
      if (!completedInterview.isPracticeMode) {
        console.log('💾 Saving completed formal interview to main collection');
        await saveInterview(completedInterview, user.id);
      } else {
        console.log('⏭️ Skipping main collection save for practice interview');
      }
      
      setCurrentInterview(completedInterview);
      
      // Remove current interview ID from local storage
      localStorage.removeItem('mockmate-current-interview');
      
      // Show appropriate toast message based on score
      const outcome = getInterviewOutcome(score);
      
      if (outcome === "passed") {
        toast({
          title: "Congratulations!",
          description: "You've passed the interview with an excellent score.",
          variant: "default",
        });
      } else if (outcome === "conditionalPass") {
        toast({
          title: "Interview Completed",
          description: "You've passed with an average score.",
          variant: "default",
        });
      } else {
        toast({
          title: "Interview Completed",
          description: "Your interview has been scored. Check your feedback for improvement areas.",
          variant: "default",
        });
      }
      
      // Navigate based on interview type
      // For formal (monitored) interviews: show thank you page
      // For practice interviews: show summary immediately

      // Log to profile activity
      const interviewType = completedInterview.isPracticeMode ? 'practice' : 'interview';
      const roleName = selectedRole?.title || completedInterview.roleId || 'Unknown Role';
      logActivity(
        interviewType,
        completedInterview.isPracticeMode ? 'Practice Interview Completed' : 'Mock Interview Completed',
        `Role: ${roleName}, Score: ${score}%`,
        { roleId: completedInterview.roleId, score, outcome, isPracticeMode: completedInterview.isPracticeMode }
      ).catch(() => {});

      setTimeout(() => {
        if (!completedInterview.isPracticeMode) {
          navigate('/interview-thank-you');
        } else {
          navigate('/summary');
        }
      }, 1500);
      
    } catch (error) {
      console.error("Error completing interview:", error);
      toast({
        title: "Error",
        description: "Could not complete the interview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetInterview = () => {
    setCurrentInterview(null);
    setCurrentQuestionIndex(0);
    setSelectedRole(null);
    localStorage.removeItem('mockmate-current-interview');
  };

  const toggleTimer = () => {
    setTimerEnabled(prev => !prev);
  };

  const getCurrentQuestion = (): Question | null => {
    if (!currentInterview) return null;
    return currentInterview.questions[currentQuestionIndex] || null;
  };

  const getCurrentAnswer = (): Answer | null => {
    if (!currentInterview) return null;
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return null;
    
    return currentInterview.answers.find(
      a => a.questionId === currentQuestion.id
    ) || null;
  };

  const getProgressPercentage = (): number => {
    if (!currentInterview) return 0;
    return (currentQuestionIndex / currentInterview.questions.length) * 100;
  };

  const sendSelectionEmailToUser = async (interviewId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const interview = await getInterview(interviewId);
      if (!interview || !interview.completed) {
        toast({
          title: "Error",
          description: "Could not find completed interview.",
          variant: "destructive",
        });
        return false;
      }

      // In a real app, this would connect to an email API or Cloud Function
      const success = await sendSelectionEmail(interview);
      
      if (success) {
        // Mark as selected and message generated in Firestore
        await updateInterview(interviewId, {
          selected: true,
          messageGenerated: true
        });
        
        toast({
          title: "Message Sent",
          description: `Selection message generated for candidate.`,
        });
        return true;
      } else {
        toast({
          title: "Error",
          description: "Could not send message. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error("Error sending selection message:", error);
      toast({
        title: "Error",
        description: "Could not send selection message. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const markInterviewAsSelected = async (interviewId: string) => {
    try {
      const interview = await getInterview(interviewId);
      if (!interview) return;

      // Update in Firestore
      await updateInterview(interviewId, {
        selected: true,
        messageGenerated: true
      });

      // If this is the current interview, update state
      if (currentInterview && currentInterview.id === interviewId) {
        setCurrentInterview({
          ...currentInterview,
          selected: true,
          messageGenerated: true
        });
      }

      toast({
        title: "Candidate Selected",
        description: `The candidate has been marked as selected for ${interview.roleName}.`,
      });
    } catch (error) {
      console.error('Error marking interview as selected:', error);
      toast({
        title: "Error",
        description: "Could not mark candidate as selected.",
        variant: "destructive",
      });
    }
  };
  
  // Function to abort an interview due to tab switching or other interruptions
  const abortInterview = async (interviewId: string, reason: string) => {
    try {
      const interview = await getInterview(interviewId);
      if (!interview) return;
      
      // Mark the interview as aborted in Firestore
      await updateInterview(interviewId, {
        completed: true,
        aborted: true,
        abortReason: reason,
        score: 0,
        endTime: new Date().toISOString()
      });
      
      // If this is the current interview, update state and reset
      if (currentInterview && currentInterview.id === interviewId) {
        setCurrentInterview(null);
        setCurrentQuestionIndex(0);
      }
      
      // Remove current interview ID from local storage
      localStorage.removeItem('mockmate-current-interview');
      
      // Log to admin (in a real app, this would send to an admin dashboard)
      console.log(`Interview ${interviewId} was aborted: ${reason}`);
      
      return true;
    } catch (error) {
      console.error("Error aborting interview:", error);
      return false;
    }
  };

  return (
    <InterviewContext.Provider
      value={{
        currentInterview,
        currentQuestionIndex,
        timerEnabled,
        isLoading,
        startInterview,
        saveAnswer,
        nextQuestion,
        previousQuestion,
        completeInterview,
        resetInterview,
        toggleTimer,
        getCurrentQuestion,
        getCurrentAnswer,
        getProgressPercentage,
        selectedRole,
        sendSelectionEmailToUser,
        markInterviewAsSelected,
        abortInterview
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (context === undefined) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }
  return context;
};
