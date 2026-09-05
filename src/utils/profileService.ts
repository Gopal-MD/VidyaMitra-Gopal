import { getAuthToken } from '@/lib/api';

// Simple ID generator - avoids needing uuid import
function generateClientId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : 
    'xxxx-xxxx-xxxx-xxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

// Helper to get auth headers - uses the SAME token store as api.ts ('vidyamitra_token')
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface UserProfile {
  id?: string;
  user_id: string;
  saved_resume_id?: string;
  saved_resume_name?: string;
  saved_resume_text?: string;
  saved_resume_skills?: string[];
  saved_resume_ats_score?: number;
  last_resume_upload?: string;
  total_interviews: number;
  total_practice_sessions: number;
  total_analyses: number;
  preferred_role?: string;
  career_goals?: string;
  updated_at?: string;
  created_at?: string;
}

export interface ProfileAnalysis {
  id?: string;
  user_id: string;
  analysis_type: string;
  analysis_data: Record<string, unknown>;
  score?: number;
  status: string;
  created_at?: string;
}

export interface ActivityItem {
  id: string;
  user_id: string;
  activity_type: string;
  activity_title: string;
  activity_description?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface SavedResume {
  id?: string;
  name: string;
  text: string;
  skills: string[];
  ats_score?: number;
  parsed_data?: Record<string, any>;
  uploaded_at?: string;
}

export interface ProfileResponse {
  profile: UserProfile;
  user: {
    id: string;
    email: string;
    name: string;
    target_role?: string;
    skills: string[];
    profile_picture?: string;
    bio?: string;
    github_url?: string;
    linkedin_url?: string;
    leetcode_url?: string;
    phone?: string;
    location?: string;
    created_at: string;
  };
}

/**
 * Get or create user profile (userId comes from session on backend)
 */
export async function getUserProfile(): Promise<ProfileResponse | null> {
  try {
    const response = await fetch('/api/profile', {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  try {
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ updates }),
    });
    if (!response.ok) {
      throw new Error('Failed to update user profile');
    }
    const data = await response.json();
    return data.profile;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Save resume to user profile
 */
export async function saveResumeToProfile(resume: SavedResume): Promise<UserProfile> {
  try {
    const response = await fetch('/api/profile/resume', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        resume: {
          ...resume,
          id: resume.id || generateClientId(),
          uploaded_at: resume.uploaded_at || new Date().toISOString(),
        },
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to save resume to profile');
    }
    const data = await response.json();
    return data.profile;
  } catch (error) {
    console.error('Error saving resume to profile:', error);
    throw error;
  }
}

/**
 * Load resume from user profile
 */
export async function loadResumeFromProfile(): Promise<SavedResume | null> {
  try {
    const response = await fetch('/api/profile/resume', {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to load resume from profile');
    }
    const data = await response.json();
    return data.resume || null;
  } catch (error) {
    console.error('Error loading resume from profile:', error);
    throw error;
  }
}

/**
 * Delete saved resume from profile
 */
export async function deleteResumeFromProfile(): Promise<void> {
  try {
    const response = await fetch('/api/profile/resume', {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete resume from profile');
    }
  } catch (error) {
    console.error('Error deleting resume from profile:', error);
    throw error;
  }
}

/**
 * Save profile analysis
 */
export async function saveProfileAnalysis(
  analysisType: string,
  analysisData: Record<string, unknown>,
  score?: number
): Promise<ProfileAnalysis> {
  try {
    const response = await fetch('/api/profile/analysis', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        analysis: {
          id: generateClientId(),
          analysis_type: analysisType,
          analysis_data: analysisData,
          score,
          status: 'completed',
          created_at: new Date().toISOString(),
        },
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to save profile analysis');
    }
    const data = await response.json();
    return data.analysis;
  } catch (error) {
    console.error('Error saving profile analysis:', error);
    throw error;
  }
}

/**
 * Get all profile analyses for current user
 */
export async function getProfileAnalyses(): Promise<ProfileAnalysis[]> {
  try {
    const response = await fetch('/api/profile/analyses', {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch profile analyses');
    }
    const data = await response.json();
    return data.analyses || [];
  } catch (error) {
    console.error('Error fetching profile analyses:', error);
    throw error;
  }
}

/**
 * Log activity to profile
 */
export async function logActivity(
  activityType: string,
  activityTitle: string,
  activityDescription?: string,
  metadata?: Record<string, unknown>
): Promise<ActivityItem> {
  try {
    const response = await fetch('/api/profile/activity', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        activity: {
          id: generateClientId(),
          activity_type: activityType,
          activity_title: activityTitle,
          activity_description: activityDescription,
          metadata: metadata || {},
          created_at: new Date().toISOString(),
        },
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to log activity');
    }
    const data = await response.json();
    return data.activity;
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
}

/**
 * Get user activity history
 */
export async function getUserActivityHistory(limit: number = 50): Promise<ActivityItem[]> {
  try {
    const response = await fetch(`/api/profile/activity?limit=${limit}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user activity history');
    }
    const data = await response.json();
    return data.activities || [];
  } catch (error) {
    console.error('Error fetching user activity history:', error);
    throw error;
  }
}

/**
 * Get user statistics
 */
export async function getUserStatistics(): Promise<{
  totalInterviews: number;
  totalPracticeSessions: number;
  totalAnalyses: number;
  totalResumeBuilds: number;
  totalCareerPlans: number;
}> {
  try {
    const response = await fetch('/api/profile/statistics', {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch user statistics');
    }
    const data = await response.json();
    return data.statistics || {
      totalInterviews: 0,
      totalPracticeSessions: 0,
      totalAnalyses: 0,
      totalResumeBuilds: 0,
      totalCareerPlans: 0,
    };
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    throw error;
  }
}

/**
 * Update user basic information
 */
export async function updateUserInfo(updates: {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  github_url?: string;
  linkedin_url?: string;
  leetcode_url?: string;
  profile_picture?: string;
  target_role?: string;
}): Promise<Record<string, unknown>> {
  try {
    const response = await fetch('/api/profile/info', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ updates }),
    });
    if (!response.ok) {
      throw new Error('Failed to update user information');
    }
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Error updating user information:', error);
    throw error;
  }
}
