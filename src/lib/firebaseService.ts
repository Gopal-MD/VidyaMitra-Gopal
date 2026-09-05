/**
 * Database Service - Replaces Firebase Firestore
 * All operations go through the REST API to SQLite backend
 */

import {
  interviewsApi,
  practiceAptitudeApi,
  practiceInterviewsApi,
  botInterviewsApi,
  practiceCodingApi,
  resumesApi,
  round1Api,
  rolesApi,
  adminApi,
} from './api';
import { InterviewSession, RoundOneAptitudeResult } from '@/types';

// ============= INTERVIEW OPERATIONS =============

export const saveInterview = async (interview: InterviewSession, userId: string) => {
  try {
    const result = await interviewsApi.save({ ...interview, userId });
    return { success: true, id: result.id };
  } catch (error: any) {
    console.error('Error saving interview:', error);
    return { success: false, error: error.message };
  }
};

const safeParse = (data: any, fallback: any = []) => {
  if (!data) return fallback;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return fallback;
    }
  }
  return data;
};

export const getUserInterviews = async (userId: string): Promise<InterviewSession[]> => {
  try {
    const data = await interviewsApi.getAll();
    return (data.interviews || []).map((i: any) => ({
      ...i,
      id: i.id,
      roleId: i.role_id || i.roleId,
      roleName: i.role_name || i.roleName,
      questions: safeParse(i.questions),
      answers: safeParse(i.answers),
      completed: !!i.completed,
      score: i.score,
      feedback: i.feedback,
      outcome: i.outcome,
      isPracticeMode: !!i.is_practice,
      aborted: !!i.aborted,
      abortReason: i.abort_reason,
      aiDetectionCount: i.ai_detection_count || 0,
      startTime: i.start_time || i.startTime,
      endTime: i.end_time || i.endTime,
      date: i.start_time || i.created_at,
    }));
  } catch (error) {
    console.error('Error getting user interviews:', error);
    return [];
  }
};

export const getAllInterviews = async (): Promise<InterviewSession[]> => {
  try {
    const data = await interviewsApi.getAll(true);
    return (data.interviews || []).map((i: any) => ({
      ...i,
      id: i.id,
      roleId: i.role_id || i.roleId,
      roleName: i.role_name || i.roleName,
      questions: safeParse(i.questions),
      answers: safeParse(i.answers),
      completed: !!i.completed,
      score: i.score,
      startTime: i.start_time || i.startTime,
      endTime: i.end_time || i.endTime,
      date: i.start_time || i.created_at,
      userId: i.user_id,
    }));
  } catch (error) {
    console.error('Error getting all interviews:', error);
    return [];
  }
};

export const deleteInterview = async (interviewId: string) => {
  try {
    await interviewsApi.delete(interviewId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting interview:', error);
    return { success: false, error };
  }
};

export const updateInterview = async (interviewId: string, updates: Partial<InterviewSession>) => {
  try {
    await interviewsApi.save({ ...updates, id: interviewId });
    return { success: true };
  } catch (error) {
    console.error('Error updating interview:', error);
    return { success: false, error };
  }
};

export const getInterview = async (interviewId: string): Promise<InterviewSession | null> => {
  try {
    const data = await interviewsApi.getAll();
    const found = (data.interviews || []).find((i: any) => i.id === interviewId);
    return found || null;
  } catch (error) {
    console.error('Error getting interview:', error);
    return null;
  }
};

// ============= USER PROFILE OPERATIONS =============
export const getUserProfile = async (userId: string) => {
  return null; // Profile is part of auth context now
};

export const updateUserProfile = async (userId: string, data: Record<string, unknown>) => {
  return { success: true };
};

// ============= ROLE MANAGEMENT =============
export const getRoleStatus = async (roleId: string) => {
  try {
    const data = await rolesApi.getAll();
    const role = (data.roles || []).find((r: any) => r.role_id === roleId);
    return role ? { isOpen: !!role.is_open } : { isOpen: true };
  } catch {
    return { isOpen: true };
  }
};

export const updateRoleStatus = async (roleId: string, isOpen: boolean) => {
  try {
    await rolesApi.update(roleId, isOpen);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

export const getAllRoles = async () => {
  try {
    const data = await rolesApi.getAll();
    return data.roles || [];
  } catch {
    return [];
  }
};

// ============= ANALYTICS =============
export const getInterviewStats = async (userId?: string) => {
  try {
    const data = userId ? await interviewsApi.getAll() : await interviewsApi.getAll(true);
    const interviews = (data.interviews || []).filter((i: any) => i.completed);
    const totalInterviews = interviews.length;
    const averageScore = totalInterviews > 0
      ? interviews.reduce((sum: number, i: any) => sum + (i.score || 0), 0) / totalInterviews
      : 0;
    const totalPassed = interviews.filter((i: any) =>
      i.outcome === 'Passed' || i.outcome === 'passed'
    ).length;

    return {
      totalInterviews,
      averageScore: Math.round(averageScore),
      totalPassed,
      passRate: totalInterviews > 0 ? Math.round((totalPassed / totalInterviews) * 100) : 0,
    };
  } catch {
    return { totalInterviews: 0, averageScore: 0, totalPassed: 0, passRate: 0 };
  }
};

// ============= PRACTICE APTITUDE OPERATIONS =============
export interface PracticeAptitudeResult {
  id: string;
  userId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  categoryPerformance: Record<string, { correct: number; total: number; percentage: number }>;
  weakTopics: string[];
  recommendations: Array<{ topic: string; videos: Array<{ title: string; channel: string; searchQuery: string }> }>;
  completedAt: string;
  createdAt: any;
}

export const savePracticeAptitudeResult = async (result: any, userId: string) => {
  try {
    const data = await practiceAptitudeApi.save(result);
    return { success: true, id: data.id };
  } catch (error: any) {
    console.error('Error saving practice aptitude:', error);
    return { success: false, error: error.message };
  }
};

export const getPracticeAptitudeHistory = async (userId: string): Promise<PracticeAptitudeResult[]> => {
  try {
    const data = await practiceAptitudeApi.getHistory();
    return (data.results || []).map((r: any) => ({
      ...r,
      userId: r.user_id || r.userId,
      totalQuestions: r.total_questions || r.totalQuestions,
      correctAnswers: r.correct_answers || r.correctAnswers,
      categoryPerformance: typeof r.category_performance === 'string' ? JSON.parse(r.category_performance) : (r.category_performance || r.categoryPerformance || {}),
      weakTopics: typeof r.weak_topics === 'string' ? JSON.parse(r.weak_topics) : (r.weak_topics || r.weakTopics || []),
      recommendations: typeof r.recommendations === 'string' ? JSON.parse(r.recommendations) : (r.recommendations || []),
      completedAt: r.completed_at || r.completedAt,
    }));
  } catch {
    return [];
  }
};

// ============= PRACTICE INTERVIEW OPERATIONS =============
export interface PracticeInterviewResult {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  questions: Array<{ question: string; answer: string; feedback: { score: number; strengths: string[]; improvements: string[]; rating: string } }>;
  overallScore: number;
  averageQuestionScore: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  completedAt: string;
  createdAt: any;
}

export const savePracticeInterviewResult = async (result: any, userId: string) => {
  try {
    const data = await practiceInterviewsApi.save(result);
    return { success: true, id: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getPracticeInterviewHistory = async (userId: string): Promise<PracticeInterviewResult[]> => {
  try {
    const data = await practiceInterviewsApi.getHistory();
    return (data.results || []).map((r: any) => ({
      ...r,
      userId: r.user_id || r.userId,
      roleId: r.role_id || r.roleId,
      roleName: r.role_name || r.roleName,
      questions: typeof r.questions === 'string' ? JSON.parse(r.questions) : (r.questions || []),
      overallScore: r.overall_score || r.overallScore || 0,
      averageQuestionScore: r.average_question_score || r.averageQuestionScore || 0,
      strengths: typeof r.strengths === 'string' ? JSON.parse(r.strengths) : (r.strengths || []),
      improvements: typeof r.improvements === 'string' ? JSON.parse(r.improvements) : (r.improvements || []),
      recommendations: typeof r.recommendations === 'string' ? JSON.parse(r.recommendations) : (r.recommendations || []),
      completedAt: r.completed_at || r.completedAt,
    }));
  } catch {
    return [];
  }
};

// ============= BOT INTERVIEW OPERATIONS =============
export interface BotInterviewResult {
  id: string;
  userId: string;
  candidateName: string;
  role: string;
  conversationLog: Array<{ role: 'friede' | 'candidate'; message: string }>;
  feedback: { overallScore: number; strengths: string[]; improvements: string[]; detailedFeedback: string };
  completedAt: string;
  createdAt: any;
}

export const saveBotInterviewResult = async (result: any, userId: string) => {
  try {
    const data = await botInterviewsApi.save(result);
    return { success: true, id: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getBotInterviewHistory = async (userId: string): Promise<BotInterviewResult[]> => {
  try {
    const data = await botInterviewsApi.getHistory();
    return (data.results || []).map((r: any) => ({
      ...r,
      userId: r.user_id || r.userId,
      candidateName: r.candidate_name || r.candidateName,
      conversationLog: typeof r.conversation_log === 'string' ? JSON.parse(r.conversation_log) : (r.conversation_log || r.conversationLog || []),
      feedback: typeof r.feedback === 'string' ? JSON.parse(r.feedback) : (r.feedback || {}),
      completedAt: r.completed_at || r.completedAt,
    }));
  } catch {
    return [];
  }
};

// ============= CODING PRACTICE OPERATIONS =============
export const savePracticeCodingResult = async (session: any, userId: string) => {
  try {
    const data = await practiceCodingApi.save(session);
    return { success: true, id: data.id };
  } catch (error) {
    return { success: false, error };
  }
};

export const getPracticeCodingSessions = async (userId: string) => {
  try {
    const data = await practiceCodingApi.getSessions();
    return (data.results || []).map((r: any) => {
      const sessionData = typeof r.session_data === 'string' ? JSON.parse(r.session_data) : (r.session_data || {});
      return {
        ...sessionData,
        id: r.id,
        date: r.date,
        startTime: r.start_time,
        endTime: r.end_time,
      };
    });
  } catch {
    return [];
  }
};

// ============= ROUND 1 APTITUDE OPERATIONS =============
export const saveRound1AptitudeResult = async (result: any, userId: string) => {
  try {
    const data = await round1Api.save(result);
    return { success: true, id: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getRound1AptitudeResults = async (userId?: string): Promise<RoundOneAptitudeResult[]> => {
  try {
    const data = await round1Api.getResults(!userId);
    return (data.results || []).map((r: any) => ({
      ...r,
      userId: r.user_id || r.userId,
      userEmail: r.user_email || r.userEmail,
      userName: r.user_name || r.userName,
      roleId: r.role_id || r.roleId,
      roleName: r.role_name || r.roleName,
      totalQuestions: r.total_questions || r.totalQuestions,
      correctAnswers: r.correct_answers || r.correctAnswers,
      categoryPerformance: typeof r.category_performance === 'string' ? JSON.parse(r.category_performance) : (r.category_performance || r.categoryPerformance || {}),
      completedAt: r.completed_at || r.completedAt,
      aborted: !!r.aborted,
      abortReason: r.abort_reason || r.abortReason,
      selectedForRound2: !!r.selected_for_round2 || !!r.selectedForRound2,
      round2EmailSent: !!r.round2_email_sent || !!r.round2EmailSent,
    }));
  } catch {
    return [];
  }
};

export const updateRound1AptitudeResult = async (resultId: string, updates: Partial<RoundOneAptitudeResult>) => {
  try {
    await round1Api.update(resultId, updates);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};