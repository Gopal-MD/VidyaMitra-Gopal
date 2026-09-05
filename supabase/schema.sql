-- ==================== VIDYAMITRA DATABASE SCHEMA ====================
-- PostgreSQL Schema for Supabase
-- Converted from SQLite schema
-- Run this in Supabase SQL Editor to create all tables

-- ==================== USERS TABLE ====================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  target_role TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  phone TEXT,
  location TEXT,
  bio TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  leetcode_url TEXT,
  profile_picture TEXT,
  user_type TEXT DEFAULT 'student',
  institution_id TEXT,
  student_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== INTERVIEWS TABLE ====================
CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT,
  role_name TEXT,
  questions JSONB DEFAULT '[]'::jsonb,
  answers JSONB DEFAULT '[]'::jsonb,
  completed BOOLEAN DEFAULT FALSE,
  score NUMERIC,
  feedback TEXT,
  outcome TEXT,
  is_practice BOOLEAN DEFAULT FALSE,
  aborted BOOLEAN DEFAULT FALSE,
  abort_reason TEXT,
  ai_detection_count INTEGER DEFAULT 0,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== PRACTICE APTITUDE TABLE ====================
CREATE TABLE IF NOT EXISTS practice_aptitude (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  score NUMERIC,
  total_questions INTEGER,
  correct_answers INTEGER,
  category_performance JSONB DEFAULT '{}'::jsonb,
  weak_topics JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== PRACTICE INTERVIEWS TABLE ====================
CREATE TABLE IF NOT EXISTS practice_interviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT,
  role_name TEXT,
  questions JSONB DEFAULT '[]'::jsonb,
  overall_score NUMERIC,
  average_question_score NUMERIC,
  strengths JSONB DEFAULT '[]'::jsonb,
  improvements JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== PRACTICE CODING TABLE ====================
CREATE TABLE IF NOT EXISTS practice_coding (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  session_data JSONB DEFAULT '{}'::jsonb,
  date TEXT,
  start_time TEXT,
  end_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== BOT INTERVIEWS TABLE ====================
CREATE TABLE IF NOT EXISTS bot_interviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  candidate_name TEXT,
  role TEXT,
  conversation_log JSONB DEFAULT '[]'::jsonb,
  feedback JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== RESUMES TABLE ====================
CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  file_name TEXT,
  raw_text TEXT,
  parsed_data JSONB DEFAULT '{}'::jsonb,
  ats_score NUMERIC,
  ats_analysis JSONB DEFAULT '{}'::jsonb,
  target_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== ROUND 1 APTITUDE TABLE ====================
CREATE TABLE IF NOT EXISTS round1_aptitude (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  user_email TEXT,
  user_name TEXT,
  role_id TEXT,
  role_name TEXT,
  score NUMERIC,
  total_questions INTEGER,
  correct_answers INTEGER,
  category_performance JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  aborted BOOLEAN DEFAULT FALSE,
  abort_reason TEXT,
  selected_for_round2 BOOLEAN DEFAULT FALSE,
  round2_email_sent BOOLEAN DEFAULT FALSE,
  round2_interview_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== ROLES TABLE ====================
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  role_id TEXT UNIQUE,
  is_open BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== CAREER PLANS TABLE ====================
CREATE TABLE IF NOT EXISTS career_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  target_role TEXT,
  skill_gaps JSONB DEFAULT '[]'::jsonb,
  training_plan JSONB DEFAULT '{}'::jsonb,
  roadmap_data JSONB DEFAULT '{}'::jsonb,
  youtube_videos JSONB DEFAULT '[]'::jsonb,
  pexels_images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== RESUME BUILDS TABLE ====================
CREATE TABLE IF NOT EXISTS resume_builds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  personal_info JSONB DEFAULT '{}'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  experience JSONB DEFAULT '[]'::jsonb,
  projects JSONB DEFAULT '[]'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  template TEXT DEFAULT 'modern',
  ats_score NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== USER PROFILES TABLE ====================
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
  saved_resume_id TEXT,
  saved_resume_name TEXT,
  saved_resume_text TEXT,
  saved_resume_skills JSONB DEFAULT '[]'::jsonb,
  saved_resume_ats_score NUMERIC,
  saved_resume_parsed_data JSONB DEFAULT '{}'::jsonb,
  last_resume_upload TIMESTAMP WITH TIME ZONE,
  total_interviews INTEGER DEFAULT 0,
  total_practice_sessions INTEGER DEFAULT 0,
  total_analyses INTEGER DEFAULT 0,
  preferred_role TEXT,
  career_goals TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  education_summary TEXT,
  experience_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== PROFILE ANALYSES TABLE ====================
CREATE TABLE IF NOT EXISTS profile_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  analysis_type TEXT NOT NULL,
  analysis_data JSONB DEFAULT '{}'::jsonb,
  score NUMERIC,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== USER ACTIVITIES TABLE ====================
CREATE TABLE IF NOT EXISTS user_activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  activity_type TEXT NOT NULL,
  activity_title TEXT NOT NULL,
  activity_description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== INSTITUTIONS TABLE ====================
CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  institution_code TEXT UNIQUE NOT NULL,
  institution_type TEXT DEFAULT 'University',
  location TEXT,
  contact_person TEXT,
  phone TEXT,
  website TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  student_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== INDEXES FOR PERFORMANCE ====================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_institution_id ON users(institution_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_completed ON interviews(completed);
CREATE INDEX IF NOT EXISTS idx_practice_aptitude_user_id ON practice_aptitude(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_interviews_user_id ON practice_interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_coding_user_id ON practice_coding(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_interviews_user_id ON bot_interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_round1_aptitude_user_id ON round1_aptitude(user_id);
CREATE INDEX IF NOT EXISTS idx_career_plans_user_id ON career_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_builds_user_id ON resume_builds(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_analyses_user_id ON profile_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_institutions_code ON institutions(institution_code);

-- ==================== ROW LEVEL SECURITY (Optional) ====================
-- Enable RLS for security
-- Note: Uncomment these if you want to use RLS
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE practice_aptitude ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE practice_interviews ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE practice_coding ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bot_interviews ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE round1_aptitude ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE career_plans ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE resume_builds ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profile_analyses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;

-- ==================== FUNCTIONS ====================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resume_builds_updated_at BEFORE UPDATE ON resume_builds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_institutions_updated_at BEFORE UPDATE ON institutions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==================== GAP ANALYSIS & LEARNING ROADMAPS ====================
-- Tables for Skill Gap Analysis Feature

CREATE TABLE IF NOT EXISTS gap_analysis (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  target_role TEXT NOT NULL,
  future_ready_score JSONB DEFAULT '{}'::jsonb,
  skill_gaps JSONB DEFAULT '[]'::jsonb,
  profile_conflicts JSONB DEFAULT '[]'::jsonb,
  job_ready_date TEXT,
  job_ready_months INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_roadmaps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  gap_analysis_id TEXT REFERENCES gap_analysis(id),
  mermaid_code TEXT,
  monthly_plan JSONB DEFAULT '[]'::jsonb,
  total_months INTEGER,
  total_hours INTEGER,
  job_ready_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_gap_analysis_user_id ON gap_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_created_at ON gap_analysis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_roadmaps_user_id ON learning_roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_roadmaps_gap_analysis_id ON learning_roadmaps(gap_analysis_id);

-- ==================== COMPANY INTERVIEW SIMULATOR ====================

CREATE TABLE IF NOT EXISTS company_interviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  company TEXT NOT NULL,
  round TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  questions_count INTEGER DEFAULT 5,
  results JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_interviews_user_id ON company_interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_company_interviews_created_at ON company_interviews(created_at DESC);

CREATE TABLE IF NOT EXISTS user_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- ==================== APP SETTINGS TABLE ====================
-- Key-value store for server-side persistent settings (e.g. proctoring config)
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== PROCTORING VIOLATION LOG ====================
-- Stores per-interview proctoring abort events for admin review
CREATE TABLE IF NOT EXISTS proctoring_violations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  interview_id TEXT,
  violation_type TEXT NOT NULL,
  reason TEXT,
  strike_count INTEGER DEFAULT 2,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proctoring_violations_user_id ON proctoring_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_violations_created_at ON proctoring_violations(created_at DESC);

-- ==================== ROUND 2 CODING TABLE ====================
CREATE TABLE IF NOT EXISTS round2_coding (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  user_email TEXT,
  user_name TEXT,
  role_name TEXT,
  score NUMERIC DEFAULT 0,
  problems_solved INTEGER DEFAULT 0,
  total_problems INTEGER DEFAULT 2,
  time_spent INTEGER DEFAULT 0,
  submissions_json JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  selected_for_round3 BOOLEAN DEFAULT FALSE,
  round3_email_sent BOOLEAN DEFAULT FALSE,
  rescheduled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_round2_coding_user_id ON round2_coding(user_id);
CREATE INDEX IF NOT EXISTS idx_round2_coding_completed_at ON round2_coding(completed_at DESC);

-- ==================== SCHEMA COMPLETE ====================
-- Run this script in Supabase SQL Editor
-- After running, use the migration script to copy data from SQLite

