/**
 * Usage Tracking Hook
 * Easy integration for tracking interview completion
 */

import { subscriptionsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export const useUsageTracking = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  /**
   * Track interview completion for institution usage monitoring
   * Call this after a student completes an interview
   */
  const trackInterviewCompletion = async (
    interviewId: string,
    interviewType: 'ai' | 'company' | 'mock' | 'practice' | 'aptitude' = 'ai',
    isVoice: boolean = false
  ) => {
    // Only track if user belongs to an institution
    if (!user?.institutionId) {
      return {
        success: true,
        message: 'No institution tracking needed',
        tracked: false,
      };
    }

    try {
      await subscriptionsApi.trackInterview(
        interviewId,
        interviewType,
        isVoice
      );

      return {
        success: true,
        message: 'Usage tracked successfully',
        tracked: true,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to track usage';
      console.error('Failed to track usage:', error);
      
      // Show error toast but don't block the user flow
      toast({
        title: 'Usage Tracking Notice',
        description: 'Unable to track usage. Please contact your institution administrator.',
        variant: 'default',
      });

      return {
        success: false,
        message: errorMessage,
        tracked: false,
      };
    }
  };

  return {
    trackInterviewCompletion,
    hasInstitution: !!user?.institutionId,
  };
};

/**
 * Example Usage in Interview Components:
 * 
 * import { useUsageTracking } from '@/hooks/useUsageTracking';
 * 
 * const MyInterviewComponent = () => {
 *   const { trackInterviewCompletion } = useUsageTracking();
 * 
 *   const handleInterviewComplete = async () => {
 *     // ... save interview results ...
 * 
 *     // Track usage (non-blocking)
 *     await trackInterviewCompletion(
 *       interviewId,
 *       'ai',          // or 'company', 'mock', etc.
 *       false          // true if voice interview
 *     );
 * 
 *     // ... continue with interview flow ...
 *   };
 * };
 */
