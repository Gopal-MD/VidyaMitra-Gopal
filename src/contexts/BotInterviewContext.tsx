import React, { createContext, useContext, useState, useCallback } from 'react';
import { InterviewContext as FriedeContext } from '../utils/friedeService';

export interface InterviewFeedback {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
}

export type InterviewPhase = 
  | 'pre-interview' 
  | 'introduction' 
  | 'active' 
  | 'closing' 
  | 'completed';

export interface BotInterviewState {
  phase: InterviewPhase;
  candidateName: string;
  role: string;
  isFirstTime: boolean;
  agreedToTerms: boolean;
  friedeContext: FriedeContext | null;
  currentQuestion: string;
  conversationLog: Array<{
    speaker: 'friede' | 'candidate';
    text: string;
    timestamp: number;
  }>;
  isFriedeSpeaking: boolean;
  isListening: boolean;
  showTranscription: boolean;
  feedback: InterviewFeedback | null;
}

interface BotInterviewContextType {
  state: BotInterviewState;
  updatePhase: (phase: InterviewPhase) => void;
  setCandidateInfo: (name: string, role: string, isFirstTime: boolean) => void;
  agreeToTerms: () => void;
  updateFriedeContext: (context: FriedeContext) => void;
  addMessage: (speaker: 'friede' | 'candidate', text: string) => void;
  setFriedeSpeaking: (speaking: boolean) => void;
  setListening: (listening: boolean) => void;
  toggleTranscription: () => void;
  setCurrentQuestion: (question: string) => void;
  setFeedback: (feedback: InterviewFeedback) => void;
  resetInterview: () => void;
}

const BotInterviewContext = createContext<BotInterviewContextType | undefined>(undefined);

const initialState: BotInterviewState = {
  phase: 'pre-interview',
  candidateName: '',
  role: '',
  isFirstTime: false,
  agreedToTerms: false,
  friedeContext: null,
  currentQuestion: '',
  conversationLog: [],
  isFriedeSpeaking: false,
  isListening: false,
  showTranscription: false,
  feedback: null,
};

export function BotInterviewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BotInterviewState>(initialState);

  const updatePhase = useCallback((phase: InterviewPhase) => {
    setState(prev => ({ ...prev, phase }));
  }, []);

  const setCandidateInfo = useCallback((name: string, role: string, isFirstTime: boolean) => {
    setState(prev => ({
      ...prev,
      candidateName: name,
      role,
      isFirstTime,
    }));
  }, []);

  const agreeToTerms = useCallback(() => {
    setState(prev => ({ ...prev, agreedToTerms: true }));
  }, []);

  const updateFriedeContext = useCallback((context: FriedeContext) => {
    setState(prev => ({ ...prev, friedeContext: context }));
  }, []);

  const addMessage = useCallback((speaker: 'friede' | 'candidate', text: string) => {
    setState(prev => ({
      ...prev,
      conversationLog: [
        ...prev.conversationLog,
        { speaker, text, timestamp: Date.now() },
      ],
    }));
  }, []);

  const setFriedeSpeaking = useCallback((speaking: boolean) => {
    setState(prev => ({ ...prev, isFriedeSpeaking: speaking }));
  }, []);

  const setListening = useCallback((listening: boolean) => {
    setState(prev => ({ ...prev, isListening: listening }));
  }, []);

  const toggleTranscription = useCallback(() => {
    setState(prev => ({ ...prev, showTranscription: !prev.showTranscription }));
  }, []);

  const setCurrentQuestion = useCallback((question: string) => {
    setState(prev => ({ ...prev, currentQuestion: question }));
  }, []);

  const setFeedback = useCallback((feedback: InterviewFeedback) => {
    setState(prev => ({ ...prev, feedback }));
  }, []);

  const resetInterview = useCallback(() => {
    setState(initialState);
  }, []);

  const value: BotInterviewContextType = {
    state,
    updatePhase,
    setCandidateInfo,
    agreeToTerms,
    updateFriedeContext,
    addMessage,
    setFriedeSpeaking,
    setListening,
    toggleTranscription,
    setCurrentQuestion,
    setFeedback,
    resetInterview,
  };

  return (
    <BotInterviewContext.Provider value={value}>
      {children}
    </BotInterviewContext.Provider>
  );
}

export function useBotInterview() {
  const context = useContext(BotInterviewContext);
  if (context === undefined) {
    throw new Error('useBotInterview must be used within BotInterviewProvider');
  }
  return context;
}
