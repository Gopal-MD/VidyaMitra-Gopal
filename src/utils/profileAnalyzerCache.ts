/**
 * Profile Analyzer Cache Service
 * Caches analysis results to prevent re-fetching on navigation
 */

interface AnalysisResult {
  radarData: Array<{ subject: string; score: number; github: number; resume: number; fullMark: number }>;
  score: number;
  gaps: string[];
  improvements: {
    general: string[];
    job_based: string[];
  };
  phases: Array<{ phase: string; title: string; focus: string; duration: string; details: string }>;
  courses: Array<{ id: string; title: string; thumbnail: string; channel: string }>;
  githubData: {
    userInfo: { name: string; avatar_url: string; login: string };
    skills: Array<{ skill: string; github_score: number }>;
    repos: number;
  };
  leetcodeData?: {
    username: string;
    totalSolved: number;
    problems: { easy: number; medium: number; hard: number };
    ranking: number | null;
    contestRating: number | null;
    skillScore: number;
    level: string;
  };
  atsScore?: {
    totalScore: number;
    breakdown: { keywords: number; sections: number; formatting: number; length: number; experience: number };
    feedback: string[];
    passesATS: boolean;
  };
  resumeSkillsCount: number;
}

interface CachedAnalysis {
  result: AnalysisResult;
  timestamp: number;
  inputs: {
    githubUrl: string;
    leetcodeInput: string;
    careerGoal: string;
    resumeFileName?: string;
  };
}

const CACHE_KEY = 'profile_analyzer_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

class ProfileAnalyzerCache {
  private cache: Map<string, CachedAnalysis>;

  constructor() {
    this.cache = new Map();
    this.loadFromLocalStorage();
  }

  // Generate cache key from inputs
  private generateKey(githubUrl: string, leetcodeInput: string, careerGoal: string, resumeFileName?: string): string {
    return `${githubUrl}|${leetcodeInput}|${careerGoal}|${resumeFileName || ''}`;
  }

  // Get cached result if available and not expired
  get(githubUrl: string, leetcodeInput: string, careerGoal: string, resumeFileName?: string): AnalysisResult | null {
    const key = this.generateKey(githubUrl, leetcodeInput, careerGoal, resumeFileName);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    if (now - cached.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      this.saveToLocalStorage();
      return null;
    }

    return cached.result;
  }

  // Set cache result
  set(
    githubUrl: string,
    leetcodeInput: string,
    careerGoal: string,
    result: AnalysisResult,
    resumeFileName?: string
  ): void {
    const key = this.generateKey(githubUrl, leetcodeInput, careerGoal, resumeFileName);
    
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      inputs: {
        githubUrl,
        leetcodeInput,
        careerGoal,
        resumeFileName,
      },
    });

    this.saveToLocalStorage();
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
    localStorage.removeItem(CACHE_KEY);
  }

  // Clear expired entries
  clearExpired(): void {
    const now = Date.now();
    let changed = false;

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > CACHE_DURATION) {
        this.cache.delete(key);
        changed = true;
      }
    }

    if (changed) {
      this.saveToLocalStorage();
    }
  }

  // Save cache to localStorage
  private saveToLocalStorage(): void {
    try {
      const serialized = JSON.stringify(Array.from(this.cache.entries()));
      localStorage.setItem(CACHE_KEY, serialized);
    } catch (error) {
      console.warn('Failed to save profile analyzer cache:', error);
    }
  }

  // Load cache from localStorage
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.cache = new Map(parsed);
        this.clearExpired(); // Clean up expired entries on load
      }
    } catch (error) {
      console.warn('Failed to load profile analyzer cache:', error);
      this.cache = new Map();
    }
  }

  // Get cache statistics
  getStats(): { count: number; oldestTimestamp: number | null } {
    let oldestTimestamp: number | null = null;

    for (const cached of this.cache.values()) {
      if (oldestTimestamp === null || cached.timestamp < oldestTimestamp) {
        oldestTimestamp = cached.timestamp;
      }
    }

    return {
      count: this.cache.size,
      oldestTimestamp,
    };
  }
}

// Export singleton instance
export const profileAnalyzerCache = new ProfileAnalyzerCache();
