-- ============================================================
-- VidyaMitra — Supabase Schema (exact match to SQLite db.ts)
--
-- STEP 1: Drop old tables first (if you already ran the wrong schema):
--
--   DROP TABLE IF EXISTS user_activities, profile_analyses, user_profiles,
--     resume_builds, career_plans, round1_aptitude, resumes, bot_interviews,
--     practice_coding, practice_interviews, practice_aptitude, interviews,
--     roles, users, institutions CASCADE;
--
-- STEP 2: Run everything below.
-- ============================================================

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
  is_active INTEGER DEFAULT 1,
  student_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now()::text),
  updated_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  is_admin INTEGER DEFAULT 0,
  target_role TEXT,
  skills TEXT DEFAULT '[]',
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
  created_at TEXT DEFAULT (now()::text),
  updated_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_id TEXT,
  role_name TEXT,
  questions TEXT DEFAULT '[]',
  answers TEXT DEFAULT '[]',
  completed INTEGER DEFAULT 0,
  score REAL,
  feedback TEXT,
  outcome TEXT,
  is_practice INTEGER DEFAULT 0,
  aborted INTEGER DEFAULT 0,
  abort_reason TEXT,
  ai_detection_count INTEGER DEFAULT 0,
  start_time TEXT,
  end_time TEXT,
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS practice_aptitude (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  score REAL,
  total_questions INTEGER,
  correct_answers INTEGER,
  category_performance TEXT DEFAULT '{}',
  weak_topics TEXT DEFAULT '[]',
  recommendations TEXT DEFAULT '[]',
  completed_at TEXT DEFAULT (now()::text),
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS practice_interviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role_id TEXT,
  role_name TEXT,
  questions TEXT DEFAULT '[]',
  overall_score REAL,
  average_question_score REAL,
  strengths TEXT DEFAULT '[]',
  improvements TEXT DEFAULT '[]',
  recommendations TEXT DEFAULT '[]',
  completed_at TEXT DEFAULT (now()::text),
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS practice_coding (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  session_data TEXT DEFAULT '{}',
  date TEXT,
  start_time TEXT,
  end_time TEXT,
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS bot_interviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  candidate_name TEXT,
  role TEXT,
  conversation_log TEXT DEFAULT '[]',
  feedback TEXT DEFAULT '{}',
  completed_at TEXT DEFAULT (now()::text),
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT,
  raw_text TEXT,
  parsed_data TEXT DEFAULT '{}',
  ats_score REAL,
  ats_analysis TEXT DEFAULT '{}',
  target_role TEXT,
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS round1_aptitude (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  role_id TEXT,
  role_name TEXT,
  score REAL,
  total_questions INTEGER,
  correct_answers INTEGER,
  category_performance TEXT DEFAULT '{}',
  completed_at TEXT DEFAULT (now()::text),
  aborted INTEGER DEFAULT 0,
  abort_reason TEXT,
  selected_for_round2 INTEGER DEFAULT 0,
  round2_email_sent INTEGER DEFAULT 0,
  round2_interview_id TEXT,
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  role_id TEXT UNIQUE,
  is_open INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS career_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_role TEXT,
  skill_gaps TEXT DEFAULT '[]',
  training_plan TEXT DEFAULT '{}',
  roadmap_data TEXT DEFAULT '{}',
  youtube_videos TEXT DEFAULT '[]',
  pexels_images TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS resume_builds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  personal_info TEXT DEFAULT '{}',
  education TEXT DEFAULT '[]',
  experience TEXT DEFAULT '[]',
  projects TEXT DEFAULT '[]',
  skills TEXT DEFAULT '[]',
  template TEXT DEFAULT 'modern',
  ats_score REAL,
  created_at TEXT DEFAULT (now()::text),
  updated_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  saved_resume_id TEXT,
  saved_resume_name TEXT,
  saved_resume_text TEXT,
  saved_resume_skills TEXT DEFAULT '[]',
  saved_resume_ats_score REAL,
  saved_resume_parsed_data TEXT DEFAULT '{}',
  last_resume_upload TEXT,
  total_interviews INTEGER DEFAULT 0,
  total_practice_sessions INTEGER DEFAULT 0,
  total_analyses INTEGER DEFAULT 0,
  preferred_role TEXT,
  career_goals TEXT,
  preferences TEXT DEFAULT '{}',
  education_summary TEXT,
  experience_summary TEXT,
  created_at TEXT DEFAULT (now()::text),
  updated_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS profile_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  analysis_type TEXT NOT NULL,
  analysis_data TEXT DEFAULT '{}',
  score REAL,
  status TEXT DEFAULT 'completed',
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS user_activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  activity_title TEXT NOT NULL,
  activity_description TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (now()::text)
);
-- ============================================================
-- Gap Analysis & Learning Roadmaps (Skill Gap Feature)
-- ============================================================

CREATE TABLE IF NOT EXISTS gap_analysis (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_role TEXT NOT NULL,
  future_ready_score TEXT DEFAULT '{}',
  skill_gaps TEXT DEFAULT '[]',
  profile_conflicts TEXT DEFAULT '[]',
  job_ready_date TEXT,
  job_ready_months INTEGER,
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS learning_roadmaps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  gap_analysis_id TEXT,
  mermaid_code TEXT,
  monthly_plan TEXT DEFAULT '[]',
  total_months INTEGER,
  total_hours INTEGER,
  job_ready_date TEXT,
  created_at TEXT DEFAULT (now()::text)
);

-- ============================================================
-- Subscription & Billing
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,
  price_annual INTEGER NOT NULL,
  max_students INTEGER NOT NULL DEFAULT 100,
  max_interviews_per_month INTEGER NOT NULL DEFAULT 300,
  max_voice_interviews INTEGER NOT NULL DEFAULT 0,
  features TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly',
  start_date TEXT,
  end_date TEXT,
  auto_renew INTEGER DEFAULT 1,
  razorpay_subscription_id TEXT,
  created_at TEXT DEFAULT (now()::text),
  updated_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS subscription_transactions (
  id TEXT PRIMARY KEY,
  subscription_id TEXT,
  institution_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending',
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  billing_cycle TEXT,
  payment_method TEXT,
  is_test INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS subscription_usage (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL UNIQUE,
  interviews_used INTEGER DEFAULT 0,
  voice_interviews_used INTEGER DEFAULT 0,
  students_count INTEGER DEFAULT 0,
  period_start TEXT,
  period_end TEXT,
  updated_at TEXT DEFAULT (now()::text)
);

-- Seed default subscription plans
INSERT INTO subscription_plans (id, name, price_monthly, price_annual, max_students, max_interviews_per_month, max_voice_interviews, features, is_active)
VALUES
  ('plan_starter', 'Starter', 199900, 1999900, 100, 300, 0, '["Basic Dashboard","Email Support (48hr)","CSV Exports"]', 1),
  ('plan_professional', 'Professional', 499900, 4999900, 300, 900, 50, '["Advanced Analytics","Priority Support (24hr)","CSV Exports","Voice Interviews (50/mo)"]', 1),
  ('plan_enterprise', 'Enterprise', 1499900, 14999900, 1000, 3000, 99999, '["Advanced Analytics","Dedicated Account Manager","API Access + Webhooks","Custom Branding","Unlimited Voice Interviews"]', 1),
  ('plan_mega', 'Mega', 4999900, 49999900, 99999, 99999, 99999, '["Unlimited Everything","Dedicated Server Instance","White-label Solution","Custom Integrations","Unlimited Voice Interviews"]', 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- App Settings (key-value store: proctoring, course_mode, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT DEFAULT (now()::text)
);

-- ============================================================
-- Platform Partners (Admin Collaboration / Course Recommendations)
-- ============================================================
CREATE TABLE IF NOT EXISTS platform_partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_url TEXT NOT NULL,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  agreement_start TEXT,
  agreement_end TEXT,
  created_at TEXT DEFAULT (now()::text),
  updated_at TEXT DEFAULT (now()::text)
);