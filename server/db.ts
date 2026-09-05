/**
 * SQLite Database Module for VidyaMitra
 * Replaces Firebase Firestore with local SQLite for easier integration
 */

import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const DB_PATH = path.resolve(process.cwd(), 'vidyamitra.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema();
    seedAdminUser();
  }
  return db;
}

function initializeSchema() {
  const database = db;

  database.exec(`
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
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
      start_time TEXT DEFAULT (datetime('now')),
      end_time TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
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
      completed_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
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
      completed_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS practice_coding (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_data TEXT DEFAULT '{}',
      date TEXT,
      start_time TEXT,
      end_time TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS bot_interviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      candidate_name TEXT,
      role TEXT,
      conversation_log TEXT DEFAULT '[]',
      feedback TEXT DEFAULT '{}',
      completed_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
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
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
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
      completed_at TEXT DEFAULT (datetime('now')),
      aborted INTEGER DEFAULT 0,
      abort_reason TEXT,
      selected_for_round2 INTEGER DEFAULT 0,
      round2_email_sent INTEGER DEFAULT 0,
      round2_interview_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      role_id TEXT UNIQUE,
      is_open INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
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
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS profile_analyses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      analysis_type TEXT NOT NULL,
      analysis_data TEXT DEFAULT '{}',
      score REAL,
      status TEXT DEFAULT 'completed',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_activities (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      activity_title TEXT NOT NULL,
      activity_description TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gap_analysis (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target_role TEXT NOT NULL,
      future_ready_score TEXT DEFAULT '{}',
      skill_gaps TEXT DEFAULT '[]',
      profile_conflicts TEXT DEFAULT '[]',
      job_ready_date TEXT,
      job_ready_months INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
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
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (gap_analysis_id) REFERENCES gap_analysis(id)
    );

    CREATE TABLE IF NOT EXISTS company_interviews (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company TEXT NOT NULL,
      round TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      questions_count INTEGER DEFAULT 5,
      results TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS round2_coding (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT,
      user_name TEXT,
      role_name TEXT,
      score REAL DEFAULT 0,
      problems_solved INTEGER DEFAULT 0,
      total_problems INTEGER DEFAULT 2,
      time_spent INTEGER DEFAULT 0,
      submissions_json TEXT DEFAULT '[]',
      completed_at TEXT DEFAULT (datetime('now')),
      selected_for_round3 INTEGER DEFAULT 0,
      round3_email_sent INTEGER DEFAULT 0,
      rescheduled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

  `);

  // Safely add columns to users table if they don't exist yet
  const userColumns = database.pragma('table_info(users)') as Array<{ name: string }>;
  const columnNames = new Set(userColumns.map(c => c.name));
  const newCols: [string, string][] = [
    ['phone', 'TEXT'],
    ['location', 'TEXT'],
    ['bio', 'TEXT'],
    ['github_url', 'TEXT'],
    ['linkedin_url', 'TEXT'],
    ['leetcode_url', 'TEXT'],
    ['profile_picture', 'TEXT'],
    ['user_type', "TEXT DEFAULT 'student'"],
    ['institution_id', 'TEXT'],
    ['student_category', 'TEXT'],
  ];
  for (const [col, type] of newCols) {
    if (!columnNames.has(col)) {
      database.exec(`ALTER TABLE users ADD COLUMN ${col} ${type}`);
    }
  }

  // Safely add columns to user_profiles table if they don't exist yet
  const profileColumns = database.pragma('table_info(user_profiles)') as Array<{ name: string }>;
  const profileColNames = new Set(profileColumns.map(c => c.name));
  const newProfileCols: [string, string][] = [
    ['saved_resume_id', 'TEXT'],
    ['saved_resume_name', 'TEXT'],
    ['saved_resume_text', 'TEXT'],
    ['saved_resume_skills', "TEXT DEFAULT '[]'"],
    ['saved_resume_ats_score', 'REAL'],
    ['saved_resume_parsed_data', "TEXT DEFAULT '{}'"],
    ['last_resume_upload', 'TEXT'],
    ['total_interviews', 'INTEGER DEFAULT 0'],
    ['total_practice_sessions', 'INTEGER DEFAULT 0'],
    ['total_analyses', 'INTEGER DEFAULT 0'],
    ['preferred_role', 'TEXT'],
    ['career_goals', 'TEXT'],
    ['preferences', "TEXT DEFAULT '{}'"],
    ['education_summary', 'TEXT'],
    ['experience_summary', 'TEXT'],
  ];
  for (const [col, type] of newProfileCols) {
    if (!profileColNames.has(col)) {
      database.exec(`ALTER TABLE user_profiles ADD COLUMN ${col} ${type}`);
    }
  }

  console.log('✅ SQLite schema initialized');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verify;
}

function seedAdminUser() {
  const database = db;
  const admin = database.prepare('SELECT * FROM users WHERE email = ?').get('admin@vidyamitra.com');
  if (!admin) {
    const id = crypto.randomUUID();
    const passwordHash = hashPassword('admin@123');
    database.prepare(
      'INSERT INTO users (id, email, password_hash, name, is_admin, user_type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, 'admin@vidyamitra.com', passwordHash, 'Admin', 1, 'admin');
    console.log('✅ Admin user seeded: admin@vidyamitra.com / admin@123');
  } else {
    // Update existing admin user to have user_type='admin'
    database.prepare('UPDATE users SET user_type = ? WHERE email = ?').run('admin', 'admin@vidyamitra.com');
  }
  
  seedInstitutions();
}

function seedInstitutions() {
  const database = db;
  
  const sampleInstitutions = [
    { name: 'VIT Bhopal University', code: 'VITBHO', email: 'contact@vitbhopal.ac.in', type: 'University', location: 'Bhopal, MP' },
    { name: 'IIT Delhi', code: 'IITD', email: 'admin@iitd.ac.in', type: 'University', location: 'New Delhi, Delhi' },
    { name: 'BITS Pilani', code: 'BITS', email: 'info@bits-pilani.ac.in', type: 'University', location: 'Pilani, Rajasthan' },
    { name: 'Anna University', code: 'AU', email: 'info@annauniv.edu', type: 'University', location: 'Chennai, Tamil Nadu' },
    { name: 'NIT Trichy', code: 'NITT', email: 'registrar@nitt.edu', type: 'University', location: 'Tiruchirappalli, Tamil Nadu' },
    { name: 'Tech Mahindra', code: 'TM', email: 'hr@techmahindra.com', type: 'Company', location: 'Pune, MH' },
    { name: 'Infosys Limited', code: 'INFY', email: 'careers@infosys.com', type: 'Company', location: 'Bangalore, KA' },
    { name: 'Wipro Technologies', code: 'WIPRO', email: 'contact@wipro.com', type: 'Company', location: 'Bangalore, KA' },
  ];

  for (const inst of sampleInstitutions) {
    const existing = database.prepare('SELECT id FROM institutions WHERE institution_code = ?').get(inst.code);
    if (!existing) {
      const id = crypto.randomUUID();
      const passwordHash = hashPassword('institution@123'); // Default password
      database.prepare(
        `INSERT INTO institutions (id, name, email, password_hash, institution_code, institution_type, location, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
      ).run(id, inst.name, inst.email, passwordHash, inst.code, inst.type, inst.location);
    }
  }
  
  console.log('✅ Sample institutions seeded (password: institution@123)');
}

export function generateId(): string {
  return crypto.randomUUID();
}
