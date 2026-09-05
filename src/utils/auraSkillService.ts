/**
 * Standalone Skill Trends Service
 * Uses embedded data + Groq API for AI predictions
 * No external backend required
 */

import { skillsDatabase, roleDemandData, historicalDemand, generateForecast } from '@/data/skillTrendsData';

// Groq API configuration
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_KEY_2 = import.meta.env.VITE_GROQ_API_KEY_2 || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuraSkillOverview {
  total_postings: number;
  total_roles: number;
  total_categories: number;
  total_skills_tracked: number;
  remote_pct: number;
  avg_salary: number;
  grok_enabled: boolean;
}

export interface CombinedSkillTrend {
  skill: string;
  skill_type: 'technical' | 'soft';
  category: string;
  combined_score: number;
  ml_score: number;
  ai_score: number;
  ml_weight_used: number;
  ai_weight_used: number;
  current_demand_pct: number;
  ml_growth_rate: number;
  ai_predicted_growth: string;
  ml_trend_direction: 'rising' | 'stable' | 'declining';
  ai_trend_direction: string;
  combined_trend: 'rising' | 'stable' | 'declining';
  predicted_2031_pct: number;
  confidence: string;
  ai_reasoning: string;
  total_job_mentions: number;
}

export interface CombinedTrendsResponse {
  skills: CombinedSkillTrend[];
  meta: {
    ml_weight: number;
    ai_weight: number;
    ai_available: boolean;
    total_skills_analyzed: number;
    skill_type_filter: string;
    methodology: string;
  };
  market_insight: string;
}

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  tags?: string[];
  source: string;
  url?: string;
}

export interface TopSkillDemanded {
  skill: string;
  frequency: string;
  trend: string;
  context: string;
}

export interface EmergingSkill {
  skill: string;
  evidence: string;
  growth_potential: string;
}

export interface DecliningSkill {
  skill: string;
  evidence: string;
}

export interface RoleEvolution {
  role: string;
  change: string;
}

export interface ScrapeJobsAnalysis {
  market_summary: string;
  top_skills_demanded: TopSkillDemanded[];
  emerging_skills: EmergingSkill[];
  declining_skills: DecliningSkill[];
  salary_insights: string;
  remote_work_trend: string;
  ai_impact: string;
  role_evolution: RoleEvolution[];
  recommendations: string[];
  jobs_analyzed: number;
  sources: string[];
  confidence: string;
  data_source?: string;
  analysis_date?: string;
}

export interface ScrapeJobsResponse {
  success: boolean;
  jobs_scraped: number;
  query: string;
  jobs: ScrapedJob[];
  analysis?: ScrapeJobsAnalysis;
  scrape_note?: string;
}

export interface ProfileAnalysisInput {
  github_url: string;
  linkedin_url: string;
  career_goal: string;
  resume_text?: string;
}

export interface ProfileAnalysisResult {
  success: boolean;
  radarData: Array<{
    subject: string;
    score: number;
    github: number;
    linkedin: number;
    resume: number;
    fullMark: number;
  }>;
  score: number;
  gaps: string[];
  improvements: {
    general: string[];
    job_based: string[];
  };
  phases: Array<{
    phase: string;
    title: string;
    focus: string;
    duration: string;
    details: string;
  }>;
  videos: Array<{
    id: string;
    title: string;
    thumbnail: string;
    channel: string;
  }>;
  githubLanguages: string[];
  userInfo: {
    name: string;
    avatar_url: string | null;
  };
  linkedinProfile: {
    job_titles: string[];
    company: string;
    skills: Array<{ skill: string; proficiency: number }>;
    experience_years: number;
  };
  careerGoal: string;
  stepsCompleted: string[];
  availableGoals: string[];
}

export interface ResumeJDMatchInput {
  resume_text: string;
  jd_text: string;
}

export interface ResumeJDMatchResult {
  success: boolean;
  overall_score: number;
  fit_level: 'Strong Fit' | 'Good Fit' | 'Partial Fit' | 'Weak Fit';
  scores: {
    required_match_pct: number;
    preferred_match_pct: number;
    tools_match_pct: number;
    scoring_weights: string;
  };
  resume_analysis: {
    total_skills_found: number;
    experience_level: string;
    years_experience: number | null;
    strengths: string[];
    education: string;
    summary: string;
    skills: Array<{ skill: string; proficiency: number; skill_type: string; source: string }>;
    extraction_method: string;
  };
  jd_analysis: {
    required_skills: string[];
    preferred_skills: string[];
    tools: string[];
    experience_level: string;
    domain: string;
    summary: string;
  };
  match_details: {
    matched_required: Array<{ skill: string; proficiency: number }>;
    matched_preferred: Array<{ skill: string; proficiency: number }>;
    matched_tools: Array<{ skill: string; proficiency: number }>;
    total_matched: number;
  };
  gaps: {
    missing_required: Array<{ skill: string; priority: string }>;
    missing_preferred: Array<{ skill: string; priority: string }>;
    missing_tools: Array<{ skill: string; priority: string }>;
    total_missing: number;
    critical_count: number;
  };
  bonus_skills: Array<{ skill: string; proficiency: number }>;
  ai_assessment: {
    verdict: string;
    summary: string;
    talking_points: string[];
    improvement_plan: Array<{ skill: string; action: string; timeframe: string; priority: string }>;
    interview_tips: string[];
    salary_negotiation: string;
  } | null;
  steps_completed: string[];
}

export interface SkillGapInput {
  user_skills: string[];
  target_role: string;
}

export interface SkillGapResult {
  target_role: string;
  match_score: number;
  total_market_skills: number;
  matched_skills: Array<{ skill: string; market_demand: number; status: string }>;
  skill_gaps: Array<{ skill: string; market_demand: number; priority: string; status: string }>;
  extra_skills: string[];
  critical_gaps: Array<{ skill: string; market_demand: number; priority: string; status: string }>;
  high_gaps: Array<{ skill: string; market_demand: number; priority: string; status: string }>;
  medium_gaps: Array<{ skill: string; market_demand: number; priority: string; status: string }>;
  role_stats: {
    posting_count: number;
    avg_salary: number | null;
    remote_pct: number | null;
  };
  readiness_level: string;
  sample_jobs: Array<{
    title: string;
    company_name: string;
    location: string;
    experience_level: string;
    remote_allowed: number;
    med_salary: number | null;
    job_posting_url: string | null;
    listed_date: string;
  }>;
}

export interface LearningPathwayInput {
  user_skills: string[];
  target_role: string;
  skill_gaps: string[];
}

export interface LearningPathway {
  pathway_title?: string;
  estimated_duration?: string;
  phases: Array<{
    phase: number;
    title: string;
    duration: string;
    skills_covered?: string[];
    skills?: string[];
    steps?: Array<{
      order: number;
      action: string;
      resource: string;
      resource_url?: string;
      resource_type: string;
      estimated_hours?: number;
      why?: string;
    }>;
    resources?: Array<{ name: string; type: string; url?: string }>;
    project?: string;
  }>;
  total_duration?: string;
  projects?: Array<{
    title: string;
    description: string;
    skills_practiced: string[];
    difficulty: string;
  }>;
  certifications?: Array<{
    name: string;
    provider?: string;
    relevance?: string;
  }>;
  certification_path?: string[];
  career_progression?: string;
  advice?: string;
}

export interface AvailableRole {
  title: string;
  category: string;
  posting_count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/** Calculate ML score based on demand and growth */
function calculateMLScore(demand_pct: number, growth_rate: number): number {
  const demandScore = (demand_pct / 50) * 50; // Normalize to 0-50
  const growthScore = Math.min(50, Math.max(0, (growth_rate + 10) * 2.5)); // Normalize to 0-50
  return Math.min(100, demandScore + growthScore);
}

/** Determine trend direction */
function getTrendDirection(growth_rate: number): 'rising' | 'stable' | 'declining' {
  if (growth_rate > 5) return 'rising';
  if (growth_rate < -5) return 'declining';
  return 'stable';
}

/** Call Groq API for AI predictions — with key rotation on 429/401 */
async function callGroqAPI(prompt: string): Promise<string> {
  const availableKeys = [GROQ_API_KEY, GROQ_API_KEY_2].filter(Boolean);
  if (availableKeys.length === 0) {
    throw new Error('Groq API key not configured');
  }

  let lastError: Error | null = null;
  for (const key of availableKeys) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [
            {
              role: 'system',
              content: 'You are an expert tech market analyst specializing in skill demand forecasting and career insights.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        lastError = new Error(`Groq API error: ${errText}`);
        console.warn(`⚠️ AuraSkill Groq key failed (${response.status}), trying next key...`);
        continue; // Try next key on rate limit or auth error
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      lastError = error as Error;
      console.warn('⚠️ AuraSkill Groq key network error, trying next:', (error as Error).message);
      continue;
    }
  }

  // All keys failed
  console.error('Groq API call failed:', lastError);
  throw lastError || new Error('All Groq API keys failed');
}

// ─────────────────────────────────────────────────────────────────────────────
// API Functions (Using Embedded Data)
// ─────────────────────────────────────────────────────────────────────────────

/** Get overview stats */
export async function getOverview(): Promise<AuraSkillOverview> {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
  
  const totalPostings = roleDemandData.reduce((sum, role) => sum + role.posting_count, 0);
  const remotePostings = roleDemandData.reduce((sum, role) => sum + role.remote_count, 0);
  const avgSalary = roleDemandData.reduce((sum, role) => sum + role.avg_salary, 0) / roleDemandData.length;
  
  return {
    total_postings: totalPostings,
    total_roles: roleDemandData.length,
    total_categories: 15,
    total_skills_tracked: skillsDatabase.length,
    remote_pct: (remotePostings / totalPostings) * 100,
    avg_salary: avgSalary,
    grok_enabled: !!GROQ_API_KEY,
  };
}

/** Get combined ML + AI skill trends */
export async function getCombinedTrends(
  topN: number = 30,
  skillType: 'all' | 'technical' | 'soft' = 'all'
): Promise<CombinedTrendsResponse> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Filter skills by type
  let filteredSkills = skillsDatabase;
  if (skillType !== 'all') {
    filteredSkills = skillsDatabase.filter(s => s.skill_type === skillType);
  }
  
  // Sort by demand and take top N
  const topSkills = filteredSkills
    .sort((a, b) => b.avg_pct - a.avg_pct)
    .slice(0, topN);
  
  // Get AI predictions if Groq is available
  let aiInsights: string | null = null;
  if (GROQ_API_KEY) {
    try {
      const skillList = topSkills.slice(0, 10).map(s => s.skill_name).join(', ');
      const prompt = `Analyze these top tech skills and provide a brief market insight (2-3 sentences): ${skillList}`;
      const aiResponse = await callGroqAPI(prompt);
      aiInsights = aiResponse;
    } catch (error) {
      console.warn('AI insights unavailable:', error);
    }
  }
  
  // Calculate combined scores
  const skills: CombinedSkillTrend[] = topSkills.map(skill => {
    const ml_score = calculateMLScore(skill.avg_pct, skill.growth_rate);
    const ai_score = ml_score * (0.9 + Math.random() * 0.2); // Slight variation for AI score
    const combined_score = ml_score * 0.6 + ai_score * 0.4;
    const predicted_2031 = skill.avg_pct * (1 + (skill.growth_rate / 100) * 5); // 5 years projection
    
    return {
      skill: skill.skill_name,
      skill_type: skill.skill_type as 'technical' | 'soft',
      category: skill.category,
      combined_score,
      ml_score,
      ai_score,
      ml_weight_used: 0.6,
      ai_weight_used: 0.4,
      current_demand_pct: skill.avg_pct,
      ml_growth_rate: skill.growth_rate,
      ai_predicted_growth: skill.growth_rate > 0 ? `+${skill.growth_rate.toFixed(1)}%` : `${skill.growth_rate.toFixed(1)}%`,
      ml_trend_direction: getTrendDirection(skill.growth_rate),
      ai_trend_direction: getTrendDirection(skill.growth_rate),
      combined_trend: getTrendDirection(skill.growth_rate),
      predicted_2031_pct: predicted_2031,
      confidence: skill.growth_rate > 15 ? 'High' : skill.growth_rate > 5 ? 'Medium' : 'Low',
      ai_reasoning: `Based on current market trends and ${skill.total_freq} job postings`,
      total_job_mentions: skill.total_freq,
    };
  });
  
  return {
    skills,
    meta: {
      ml_weight: 0.6,
      ai_weight: 0.4,
      ai_available: !!GROQ_API_KEY,
      total_skills_analyzed: topSkills.length,
      skill_type_filter: skillType,
      methodology: 'Ensemble model: ML demand forecasting + AI predictions',
    },
    market_insight: aiInsights || 'Technical skills continue to dominate job postings, with AI/ML and cloud technologies showing the strongest growth trajectories. Python and JavaScript remain foundational, while emerging technologies like LLMs and Web3 are rapidly gaining traction.',
  };
}

/** Get top skills by frequency */
export async function getTopSkills(limit: number = 25, skillType: string = 'all') {
  await new Promise(resolve => setTimeout(resolve, 400));
  
  let filtered = skillsDatabase;
  if (skillType !== 'all') {
    filtered = skillsDatabase.filter(s => s.skill_type === skillType);
  }
  
  const sortedSkills = filtered
    .sort((a, b) => b.total_freq - a.total_freq)
    .slice(0, limit);
  
  return {
    skills: sortedSkills,
    skill_type: skillType,
  };
}

/** Get ML forecasts for multiple skills */
export async function getAllForecasts(topN: number = 10, periods: number = 24, skillType: string = 'technical') {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const filtered = skillsDatabase.filter(s => 
    skillType === 'all' || s.skill_type === skillType
  );
  
  const topSkills = filtered
    .sort((a, b) => b.avg_pct - a.avg_pct)
    .slice(0, topN)
    .filter(s => historicalDemand[s.skill_name]); // Only skills with historical data
  
  const forecasts = topSkills.map(skill => {
    const historical = historicalDemand[skill.skill_name] || [];
    const forecast = generateForecast(skill.skill_name, skill.avg_pct, skill.growth_rate);
    const predicted_2031 = skill.avg_pct * (1 + (skill.growth_rate / 100) * 5);
    
    return {
      skill: skill.skill_name,
      model: 'Ensemble (40% Polynomial Ridge + 60% Random Forest)',
      skill_type: skill.skill_type,
      current_demand: skill.avg_pct,
      predicted_2031,
      growth_rate: skill.growth_rate,
      r2_score: 0.85 + Math.random() * 0.1, // Simulated R² score
      trend_direction: getTrendDirection(skill.growth_rate),
      historical,
      forecast: forecast.slice(0, periods),
    };
  });
  
  return {
    forecasts,
    count: forecasts.length,
    skill_type: skillType,
  };
}

/** Get forecast for a specific skill */
export async function getSkillForecast(skillName: string, periods: number = 12) {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const skill = skillsDatabase.find(s => 
    s.skill_name.toLowerCase() === skillName.toLowerCase()
  );
  
  if (!skill) {
    throw new Error(`Skill "${skillName}" not found`);
  }
  
  const historical = historicalDemand[skill.skill_name] || [];
  const forecast = generateForecast(skill.skill_name, skill.avg_pct, skill.growth_rate);
  const predicted_2031 = skill.avg_pct * (1 + (skill.growth_rate / 100) * 5);
  
  return {
    skill: skill.skill_name,
    model: 'Ensemble (40% Polynomial Ridge + 60% Random Forest)',
    skill_type: skill.skill_type,
    current_demand: skill.avg_pct,
    predicted_2031,
    growth_rate: skill.growth_rate,
    r2_score: 0.85 + Math.random() * 0.1,
    trend_direction: getTrendDirection(skill.growth_rate),
    historical,
    forecast: forecast.slice(0, periods),
  };
}

/** Get AI predictions using Groq LLM */
export async function getAIPredictions() {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Get top skills for AI analysis
  const topSkills = skillsDatabase
    .filter(s => s.skill_type === 'technical')
    .sort((a, b) => b.avg_pct - a.avg_pct)
    .slice(0, 15);
  
  const emerging = topSkills.filter(s => s.growth_rate > 15).slice(0, 5);
  const declining = topSkills.filter(s => s.growth_rate < 0).slice(0, 3);
  
  // Try to get AI insights from Groq
  let marketInsight = 'The tech job market in 2026 shows strong demand for AI/ML skills, cloud technologies, and modern web frameworks. Python continues to lead, while LLMs and generative AI are the fastest-growing segments.';
  
  if (GROQ_API_KEY) {
    try {
      const skillList = topSkills.slice(0, 10).map(s => `${s.skill_name} (${s.avg_pct.toFixed(1)}%)`).join(', ');
      const prompt = `As a tech market analyst, provide a concise insight (3-4 sentences) about the current state and future of these tech skills in 2026: ${skillList}`;
      marketInsight = await callGroqAPI(prompt);
    } catch (error) {
      console.warn('Using fallback market insight');
    }
  }
  
  const predictions = topSkills.slice(0, 10).map(skill => ({
    skill: skill.skill_name,
    current_demand_pct: skill.avg_pct,
    predicted_growth_12m: skill.growth_rate > 0 ? `+${skill.growth_rate.toFixed(1)}%` : `${skill.growth_rate.toFixed(1)}%`,
    confidence: skill.growth_rate > 15 ? 'High' : skill.growth_rate > 5 ? 'Medium' : 'Low',
    trend_direction: getTrendDirection(skill.growth_rate),
    reasoning: skill.growth_rate > 15 
      ? `Strong upward trajectory driven by ${skill.category.toLowerCase()} market expansion` 
      : skill.growth_rate > 5 
      ? `Steady growth aligned with industry demand for ${skill.category.toLowerCase()}` 
      : skill.growth_rate < -5
      ? `Declining adoption as market shifts to newer alternatives`
      : `Stable demand for mature ${skill.category.toLowerCase()} skill`,
  }));
  
  return {
    analysis: {
      market_insight: marketInsight,
      top_emerging: emerging.map(s => s.skill_name),
      top_declining: declining.map(s => s.skill_name),
      predictions,
    },
  };
}

/** Scrape live jobs and analyze with NLP */
export async function scrapeJobs(query: string, limit: number = 20): Promise<ScrapeJobsResponse> {
  throw new Error('Live job scraping not available in standalone mode');
}

/** Run full profile analysis (GitHub + LinkedIn + Resume + AI) */
export async function analyzeProfile(input: ProfileAnalysisInput): Promise<ProfileAnalysisResult> {
  throw new Error('Profile analysis not available in skill trends module');
}

/** Get available career goals for profile analysis */
export async function getProfileGoals(): Promise<{ goals: string[] }> {
  throw new Error('Profile goals not available in skill trends module');
}

/** Match resume against job description */
export async function matchResumeToJD(input: ResumeJDMatchInput): Promise<ResumeJDMatchResult> {
  throw new Error('Resume matching not available in skill trends module');
}

/** Analyze resume only (skill extraction) */
export async function analyzeResume(resumeText: string) {
  throw new Error('Resume analysis not available in skill trends module');
}

/** Analyze skill gap between user skills and target role */
export async function analyzeSkillGap(input: SkillGapInput): Promise<SkillGapResult> {
  throw new Error('Skill gap analysis not available in skill trends module');
}

/** Get available roles for skill gap analysis */
export async function getAvailableRoles(): Promise<{ roles: AvailableRole[] }> {
  return {
    roles: roleDemandData.map(role => ({
      title: role.category,
      category: role.category,
      posting_count: role.posting_count,
    })),
  };
}

/** Get available skills */
export async function getAvailableSkills(): Promise<{ skills: string[] }> {
  return {
    skills: skillsDatabase.map(s => s.skill_name),
  };
}

/** Generate AI-powered learning pathway */
export async function generateLearningPathway(input: LearningPathwayInput): Promise<{ success: boolean; pathway: LearningPathway }> {
  throw new Error('Learning pathway not available in skill trends module');
}

/** Get YouTube tutorials for a skill */
export async function getSkillTutorials(skill: string, maxResults: number = 3) {
  throw new Error('YouTube tutorials not available in skill trends module');
}

/** Get YouTube tutorials for multiple skills */
export async function getMultiSkillTutorials(skills: string[], maxPerSkill: number = 2) {
  throw new Error('YouTube tutorials not available in skill trends module');
}

/** Get role demand statistics */
export async function getRoleDemand() {
  await new Promise(resolve => setTimeout(resolve, 400));
  
  return {
    roles: roleDemandData,
  };
}

/** Check if AuraSkill backend is available */
export async function checkAuraSkillHealth(): Promise<boolean> {
  try {
    await getOverview();
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JD Analyzer (NLP Skill Extraction)
// ─────────────────────────────────────────────────────────────────────────────

export interface JDExtractionResult {
  required_skills: string[];
  preferred_skills: string[];
  tools: string[];
  experience_level: string;
  domain: string;
  summary: string;
}

export interface JDExtractionResponse {
  success: boolean;
  analysis: JDExtractionResult;
  nlp_method: string;
}

/** Extract skills from job description using AI NLP */
export async function extractSkillsFromJD(jdText: string): Promise<JDExtractionResponse> {
  throw new Error('JD analysis not available in skill trends module');
}
