/**
 * Migration: SQLite → Supabase
 *
 * Reads all rows from the local SQLite database and upserts them into Supabase.
 * Run AFTER creating the schema in Supabase (see instructions printed at end).
 *
 * Usage:  npx tsx scripts/migrateToSupabase.ts
 */
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env') });

const { createClient } = require('@supabase/supabase-js');
const Database = require('better-sqlite3');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
const dbPath = resolve(__dirname, '../vidyamitra.db');
const db = new Database(dbPath);

const TABLES = [
  'institutions',   // no foreign keys
  'roles',          // no foreign keys
  'users',          // depends on institutions
  'interviews',     // depends on users
  'practice_aptitude',
  'practice_interviews',
  'practice_coding',
  'bot_interviews',
  'resumes',
  'round1_aptitude',
  'career_plans',
  'resume_builds',
  'user_profiles',
  'profile_analyses',
  'user_activities',
];

const BATCH_SIZE = 500;

/** Remove null bytes (\u0000) from all string values — PostgreSQL rejects them */
function sanitizeRow(row: any): any {
  const clean: any = {};
  for (const key of Object.keys(row)) {
    const val = row[key];
    if (typeof val === 'string') {
      // Strip null bytes and other PostgreSQL-incompatible control characters
      clean[key] = val.replace(/\u0000/g, '').replace(/\x00/g, '');
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

async function migrateTable(table: string): Promise<void> {
  let rows: any[];
  try {
    rows = db.prepare(`SELECT * FROM ${table}`).all();
  } catch (e: any) {
    console.warn(`  ⚠️  Table ${table} not found in SQLite: ${e.message}`);
    return;
  }

  if (!rows.length) {
    console.log(`  ⏭️  ${table}: 0 rows (skipped)`);
    return;
  }

  // Process in batches
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE).map(sanitizeRow);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`  ❌ ${table} batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      console.error(`     Code: ${error.code}, Details: ${error.details}`);
    } else {
      inserted += batch.length;
    }
  }
  console.log(`  ✅ ${table}: ${inserted}/${rows.length} rows migrated`);
}

async function main() {
  console.log('\n🚀 VidyaMitra — SQLite → Supabase Migration');
  console.log('='.repeat(50));
  console.log(`Source:      ${dbPath}`);
  console.log(`Destination: ${SUPABASE_URL}`);
  console.log('');

  // Verify Supabase connection
  const { error: pingError } = await supabase.from('users').select('id').limit(1);
  if (pingError && pingError.code !== 'PGRST116') {
    console.error('❌ Cannot reach Supabase:', pingError.message);
    console.error('   Make sure you have created the tables first (see schema below)');
    printSchema();
    process.exit(1);
  }
  console.log('✅ Supabase connection verified\n');

  for (const table of TABLES) {
    process.stdout.write(`  📦 Migrating ${table}...`);
    process.stdout.write('\r');
    await migrateTable(table);
  }

  console.log('\n✅ Migration complete!\n');
  console.log('Next steps:');
  console.log('  1. Open .env and change:  DB_TYPE=supabase');
  console.log('  2. Run: npm run dev');
  console.log('  3. Verify the app works normally');
}

function printSchema() {
  console.log(`
${'─'.repeat(60)}
CREATE TABLE SQL (run in Supabase SQL Editor FIRST):
${'─'.repeat(60)}

CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  institution_code TEXT UNIQUE,
  password_hash TEXT,
  is_active INTEGER DEFAULT 1,
  student_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  skills TEXT,
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  user_type TEXT DEFAULT 'student',
  institution_id TEXT,
  student_category TEXT,
  target_role TEXT,
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  role_id TEXT,
  role_name TEXT,
  questions TEXT,
  answers TEXT,
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
  user_id TEXT,
  score REAL,
  total_questions INTEGER,
  correct_answers INTEGER,
  category_performance TEXT,
  weak_topics TEXT,
  recommendations TEXT,
  completed_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS practice_interviews (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  role_id TEXT,
  role_name TEXT,
  questions TEXT,
  overall_score REAL,
  average_question_score REAL,
  strengths TEXT,
  improvements TEXT,
  recommendations TEXT,
  completed_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS practice_coding (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  problem_id TEXT,
  problem_title TEXT,
  language TEXT,
  code TEXT,
  status TEXT,
  test_results TEXT,
  score REAL,
  time_taken INTEGER,
  completed_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS bot_interviews (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  candidate_name TEXT,
  role TEXT,
  conversation_log TEXT,
  feedback TEXT,
  completed_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  filename TEXT,
  file_data TEXT,
  file_size INTEGER,
  mime_type TEXT,
  parsed_text TEXT,
  uploaded_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS round1_aptitude (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  score REAL,
  total_questions INTEGER,
  correct_answers INTEGER,
  time_taken INTEGER,
  answers TEXT,
  completed_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS career_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  target_role TEXT,
  current_skills TEXT,
  plan_data TEXT,
  created_at TEXT DEFAULT (now()::text),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS resume_builds (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  resume_data TEXT,
  template TEXT,
  created_at TEXT DEFAULT (now()::text),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE,
  bio TEXT,
  skills TEXT,
  experience TEXT,
  education TEXT,
  social_links TEXT,
  created_at TEXT DEFAULT (now()::text),
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS profile_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  resume_score REAL,
  skill_gaps TEXT,
  recommendations TEXT,
  analyzed_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS user_activities (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  activity_type TEXT,
  activity_data TEXT,
  created_at TEXT DEFAULT (now()::text)
);
${'─'.repeat(60)}
`);
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
