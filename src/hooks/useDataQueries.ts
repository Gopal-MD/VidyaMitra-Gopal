/**
 * Custom React Query hooks for efficient data fetching with caching
 * Prevents unnecessary refetches and improves performance
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, institutionsApi, interviewsApi, newsApi, exchangeApi, round2Api } from '@/lib/api';
import { 
  getAllInterviews, 
  getRound1AptitudeResults, 
  getUserInterviews,
  getBotInterviewHistory,
  getPracticeInterviewHistory,
  getPracticeAptitudeHistory,
} from '@/lib/firebaseService';
import { getUserProfile, getUserActivityHistory, getUserStatistics } from '@/utils/profileService';

// Query Keys
export const QUERY_KEYS = {
  ADMIN_STATS: 'adminStats',
  ADMIN_INTERVIEWS: 'adminInterviews',
  ROUND1_RESULTS: 'round1Results',
  INSTITUTIONS: 'institutions',
  INSTITUTION_STUDENTS: (institutionId: string) => ['institutionStudents', institutionId],
  INSTITUTION_ANALYTICS: (institutionId: string) => ['institutionAnalytics', institutionId],
  USER_INTERVIEWS: (userId: string) => ['userInterviews', userId],
  USER_ROUND1_RESULTS: (userId: string) => ['userRound1Results', userId],
  PRACTICE_APTITUDE: (userId: string) => ['practiceAptitude', userId],
  PRACTICE_INTERVIEWS: (userId: string) => ['practiceInterviews', userId],
  BOT_INTERVIEWS: (userId: string) => ['botInterviews', userId],
  USER_PROFILE: (userId: string) => ['userProfile', userId],
  USER_STATISTICS: (userId: string) => ['userStatistics', userId],
  USER_ACTIVITY: (userId: string) => ['userActivity', userId],
  NEWS: 'news',
  EXCHANGE_RATES: 'exchangeRates',
  ROUND2_RESULTS: 'round2Results',
};

// ==================== ADMIN QUERIES ====================

/**
 * Hook to fetch admin statistics
 * Cached for 5 minutes, refetches every 30 seconds in background
 */
export function useAdminStats() {
  return useQuery({
    queryKey: [QUERY_KEYS.ADMIN_STATS],
    queryFn: async () => {
      const stats = await adminApi.getStats();
      return stats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Refetch every 30 seconds in background
  });
}

/**
 * Hook to fetch all admin interviews
 * Cached for 5 minutes
 */
export function useAdminInterviews() {
  return useQuery({
    queryKey: [QUERY_KEYS.ADMIN_INTERVIEWS],
    queryFn: async () => {
      const interviews = await getAllInterviews();
      return interviews;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Hook to fetch Round 1 aptitude results
 * Cached for 5 minutes
 */
export function useRound1Results() {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUND1_RESULTS],
    queryFn: async () => {
      const results = await getRound1AptitudeResults();
      return results;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Hook to fetch Round 2 coding results (admin)
 */
export function useRound2Results() {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUND2_RESULTS],
    queryFn: async () => {
      const data = await round2Api.getAll();
      return (data.results || []) as any[];
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

/**
 * Hook to fetch all institutions
 * Cached for 10 minutes
 */
export function useInstitutions() {
  return useQuery({
    queryKey: [QUERY_KEYS.INSTITUTIONS],
    queryFn: async () => {
      const data = await adminApi.getInstitutions();
      return data.institutions || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// ==================== INSTITUTION QUERIES ====================

/**
 * Hook to fetch institution students
 * Cached for 5 minutes
 */
export function useInstitutionStudents(institutionId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.INSTITUTION_STUDENTS(institutionId || ''),
    queryFn: async () => {
      if (!institutionId) return { students: [] };
      const data = await institutionsApi.getStudents(institutionId);
      return data;
    },
    enabled: !!institutionId, // Only fetch if institutionId exists
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch institution analytics
 * Cached for 5 minutes
 */
export function useInstitutionAnalytics(institutionId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.INSTITUTION_ANALYTICS(institutionId || ''),
    queryFn: async () => {
      if (!institutionId) return null;
      const data = await institutionsApi.getAnalytics(institutionId);
      return data;
    },
    enabled: !!institutionId,
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== USER QUERIES ====================

/**
 * Hook to fetch user's interviews
 * Cached for 5 minutes
 */
export function useUserInterviews(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.USER_INTERVIEWS(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      return await getUserInterviews(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch user's Round 1 aptitude results  
 * Cached for 5 minutes
 */
export function useUserRound1Results(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.USER_ROUND1_RESULTS(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      return await getRound1AptitudeResults(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch practice aptitude history
 * Cached for 5 minutes
 */
export function usePracticeAptitude(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.PRACTICE_APTITUDE(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      return await getPracticeAptitudeHistory(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch practice interview history
 * Cached for 5 minutes
 */
export function usePracticeInterviews(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.PRACTICE_INTERVIEWS(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      return await getPracticeInterviewHistory(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch bot interview history
 * Cached for 5 minutes
 */
export function useBotInterviews(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.BOT_INTERVIEWS(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      return await getBotInterviewHistory(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch user profile
 * Cached for 5 minutes
 */
export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.USER_PROFILE(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      return await getUserProfile();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch user statistics
 * Cached for 5 minutes
 */
export function useUserStatistics(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.USER_STATISTICS(userId || ''),
    queryFn: async () => {
      if (!userId) return null;
      return await getUserStatistics();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch user activity history
 * Cached for 5 minutes
 */
export function useUserActivity(userId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.USER_ACTIVITY(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      return await getUserActivityHistory(20);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch news
 * Cached for 15 minutes
 */
export function useNews(query = 'technology career jobs') {
  return useQuery({
    queryKey: [QUERY_KEYS.NEWS, query],
    queryFn: async () => {
      try {
        const data = await newsApi.search(query);
        return data.articles || [];
      } catch (error) {
        console.error('Failed to fetch news:', error);
        return [];
      }
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Hook to fetch exchange rates
 * Cached for 30 minutes
 */
export function useExchangeRates() {
  return useQuery({
    queryKey: [QUERY_KEYS.EXCHANGE_RATES],
    queryFn: async () => {
      try {
        return await exchangeApi.getRates();
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        return null;
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// ==================== MUTATIONS ====================

/**
 * Mutation hook for creating an institution
 */
export function useCreateInstitution() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => adminApi.createInstitution(data),
    onSuccess: () => {
      // Invalidate institutions query to refetch
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTITUTIONS] });
    },
  });
}

/**
 * Mutation hook for updating an institution
 */
export function useUpdateInstitution() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => 
      adminApi.updateInstitution(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.INSTITUTIONS] });
    },
  });
}

// ==================== OPTIMISTIC UPDATES ====================

/**
 * Hook to prefetch data for better UX
 * Call this when user hovers over a navigation item
 */
export function usePrefetchQueries() {
  const queryClient = useQueryClient();
  
  return {
    prefetchAdminStats: () => {
      queryClient.prefetchQuery({
        queryKey: [QUERY_KEYS.ADMIN_STATS],
        queryFn: () => adminApi.getStats(),
      });
    },
    prefetchInstitutions: () => {
      queryClient.prefetchQuery({
        queryKey: [QUERY_KEYS.INSTITUTIONS],
        queryFn: async () => {
          const data = await adminApi.getInstitutions();
          return data.institutions || [];
        },
      });
    },
  };
}
