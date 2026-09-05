/**
 * Unified Async Database Layer — SQLite (dev) ↔ Supabase (prod)
 * 
 * DB_TYPE=sqlite   → better-sqlite3, fully synchronous, wrapped in Promise
 * DB_TYPE=supabase → @supabase/supabase-js over HTTPS (no TCP, no firewall issues)
 *
 * Usage: await DB.get(sql, [params])  → single row | null
 *        await DB.all(sql, [params])  → rows[]
 *        await DB.run(sql, [params])  → { changes: number }
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase();

// ==================== CRASH GUARD ====================
// Prevent low-network fetch errors from killing the Vite dev process
process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || String(reason);
  if (msg.includes('fetch failed') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('network')) {
    console.error('⚠️  [DB] Network error (Supabase unreachable) — server stays running:', msg);
  } else {
    console.error('⚠️  [DB] Unhandled rejection (non-fatal):', reason?.stack || msg);
  }
});

/** Retry a Supabase operation up to `attempts` times on network failure */
async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 2): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = err?.message || String(err);
      const isNetwork = msg.includes('fetch failed') || msg.includes('ECONNREFUSED') ||
                        msg.includes('ENOTFOUND') || msg.includes('network') || msg.includes('timeout');
      if (isNetwork && i < attempts - 1) {
        console.warn(`⚠️  [DB] Network error on ${label}, retrying (${i + 1}/${attempts - 1})...`);
        await new Promise(r => setTimeout(r, 1000 * (i + 1))); // exponential back-off
        continue;
      }
      if (isNetwork) {
        throw new Error(`[DB] Supabase unreachable (no network). Query: ${label}. Original: ${msg}`);
      }
      throw err;
    }
  }
  throw new Error(`[DB] withRetry exhausted for ${label}`);
}

// ==================== SQLITE ====================
let sqliteDb: any = null;

function getSqliteDb() {
  if (sqliteDb) return sqliteDb;
  const Database = require('better-sqlite3');
  const dbPath = resolve(__dirname, '../vidyamitra.db');
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
  return sqliteDb;
}

async function sqliteGet(sql: string, params: any[]): Promise<any> {
  const db = getSqliteDb();
  return db.prepare(sql).get(...params) ?? null;
}
async function sqliteAll(sql: string, params: any[]): Promise<any[]> {
  const db = getSqliteDb();
  return db.prepare(sql).all(...params);
}
async function sqliteRun(sql: string, params: any[]): Promise<{ changes: number }> {
  const db = getSqliteDb();
  const r = db.prepare(sql).run(...params);
  return { changes: r.changes ?? 0 };
}

// ==================== SUPABASE ====================
let _supabase: any = null;

function getSupabase() {
  if (_supabase) return _supabase;
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  console.log('✅ Supabase client connected (HTTPS)');
  return _supabase;
}

// ---------- SQL → Supabase translator ----------

// Known boolean columns (only in tables created with Postgres BOOLEAN, e.g. round2_coding)
// All other existing tables (interviews, institutions, users, round1) use INTEGER (0/1) in Supabase.
const BOOLEAN_COLS = new Set([
  'selected_for_round3',
  'round3_email_sent',
  'rescheduled',
]);

/** Normalize SQL: collapse whitespace, strip surrounding backticks/quotes in template literals */
function norm(sql: string) {
  return sql.replace(/\s+/g, ' ').trim();
}

/** Convert ? placeholders to positional values inline (for Supabase JS, we pass JS values directly) */
function bindParams(sql: string, params: any[]): [string, any[]] {
  // Replace datetime('now') with ISO timestamp in params are not needed, just in SQL
  const bounded = sql.replace(/datetime\('now'\)/gi, "'" + new Date().toISOString() + "'");
  return [bounded, params];
}

/** Extract table name after FROM/INTO/UPDATE */
function extractTable(sql: string, keyword: string): string {
  const re = new RegExp(keyword + '\\s+(\\w+)', 'i');
  const m = sql.match(re);
  if (!m) throw new Error(`Cannot extract table from: ${sql.slice(0, 80)}`);
  return m[1];
}

/** Parse WHERE clause → array of { col, op, value|null } */
function parseWhere(whereClause: string, params: any[], startIdx = 0): [any[], number] {
  if (!whereClause) return [[], startIdx];
  // Split on AND (not inside parens)
  const parts = whereClause.split(/\s+AND\s+/i);
  const conditions: any[] = [];
  let pi = startIdx;
  for (const part of parts) {
    const p = part.trim();
    // col = ?
    const eq = p.match(/^(\w+)\s*=\s*\?$/);
    if (eq) { conditions.push({ col: eq[1], op: 'eq', val: params[pi++] }); continue; }
    // col != ? or col <> ?
    const ne = p.match(/^(\w+)\s*(?:!=|<>)\s*\?$/);
    if (ne) { conditions.push({ col: ne[1], op: 'neq', val: params[pi++] }); continue; }
    // col != 'string' or col <> 'string' (literal, including '')
    const neStr = p.match(/^(\w+)\s*(?:!=|<>)\s*'([^']*)'$/);
    if (neStr) { conditions.push({ col: neStr[1], op: 'neq', val: neStr[2] }); continue; }
    // col IS NULL
    const isNull = p.match(/^(\w+)\s+IS\s+NULL$/i);
    if (isNull) { conditions.push({ col: isNull[1], op: 'is', val: null }); continue; }
    // col IS NOT NULL
    const notNull = p.match(/^(\w+)\s+IS\s+NOT\s+NULL$/i);
    if (notNull) { conditions.push({ col: notNull[1], op: 'not_null', val: null }); continue; }
    // col = 1 (literal integer, e.g. completed = 1)
    const eqLit = p.match(/^(\w+)\s*=\s*(\d+)$/);
    if (eqLit) { conditions.push({ col: eqLit[1], op: 'eq', val: parseInt(eqLit[2]) }); continue; }
    // col = TRUE or col = FALSE (boolean literals)
    const eqBool = p.match(/^(\w+)\s*=\s*(TRUE|FALSE)$/i);
    if (eqBool) { conditions.push({ col: eqBool[1], op: 'eq', val: eqBool[2].toUpperCase() === 'TRUE' }); continue; }
    // col = 'string'
    const eqStr = p.match(/^(\w+)\s*=\s*'([^']+)'$/);
    if (eqStr) { conditions.push({ col: eqStr[1], op: 'eq', val: eqStr[2] }); continue; }
    // col LIKE ?
    const like = p.match(/^(\w+)\s+LIKE\s+\?$/i);
    if (like) { conditions.push({ col: like[1], op: 'like', val: params[pi++] }); continue; }
    // col IN ('string1', 'string2')
    const inListStr = p.match(/^(\w+)\s+IN\s+\(([^)]+)\)$/i);
    if (inListStr) { 
      const vals = inListStr[2].split(',').map(s => s.trim().replace(/^'|'$/g, ''));
      conditions.push({ col: inListStr[1], op: 'in', val: vals }); 
      continue; 
    }
    // Fallback — log and skip
    console.warn('[DB] WHERE condition not parsed:', p);
  }
  return [conditions, pi];
}

/** Apply parsed WHERE conditions to Supabase query */
function applyWhere(q: any, conditions: any[]) {
  for (const c of conditions) {
    let val = c.val;
    if (BOOLEAN_COLS.has(c.col.toLowerCase())) {
      if (val === 0 || val === '0') val = false;
      else if (val === 1 || val === '1') val = true;
    }
    if (c.op === 'eq') q = q.eq(c.col, val);
    else if (c.op === 'neq') q = q.neq(c.col, val);
    else if (c.op === 'is') q = q.is(c.col, null);
    else if (c.op === 'not_null') q = q.not(c.col, 'is', null);
    else if (c.op === 'like') q = q.like(c.col, val);
    else if (c.op === 'in') q = q.in(c.col, val);
  }
  return q;
}

// -------- SELECT --------
async function pgSelect(sql: string, params: any[], single: boolean): Promise<any> {
  const s = getSupabase();
  const n = norm(sql);

  // ---- Complex queries: handled with JS aggregation ----
  // Subquery anywhere in SELECT list  (e.g. SELECT i.*, (SELECT COUNT(*) ...) as student_count)
  if (/\(SELECT/i.test(n)) return pgSelectSubquery(n, params);
  // GROUP BY (check before JOIN — many JOIN queries also have GROUP BY and the GROUP BY handler covers them)
  if (/GROUP\s+BY/i.test(n)) return pgSelectGroupBy(n, params);
  // JOIN queries for institution analytics
  if (/JOIN/i.test(n)) return pgSelectJoin(n, params, single);

  // ---- Simple SELECT ----
  const tableM = n.match(/FROM\s+(\w+)/i);
  if (!tableM) throw new Error('No table: ' + n.slice(0, 80));
  const table = tableM[1];

  // SELECT columns
  const colsM = n.match(/^SELECT\s+(.+?)\s+FROM\s+\w+/i);
  let cols = colsM ? colsM[1].trim() : '*';

  // COUNT (*)
  const isCount = /^COUNT\s*\(\s*\*\s*\)/i.test(cols) || /^COUNT\s*\(\s*\*\s*\)\s+as\s+/i.test(cols);
  const countAlias = isCount ? (cols.match(/as\s+(\w+)/i)?.[1] ?? 'count') : null;
  // AVG(col)
  const isAvg = /^AVG\s*\(/i.test(cols);
  const avgAlias = isAvg ? (cols.match(/as\s+(\w+)/i)?.[1] ?? 'avg') : null;
  const avgCol = isAvg ? (cols.match(/AVG\s*\(\s*(\w+)\s*\)/i)?.[1] ?? 'score') : null;

  // WHERE
  const whereM = n.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i);
  const whereStr = whereM ? whereM[1].trim() : '';
  const [conditions] = parseWhere(whereStr, params, 0);

  // ORDER BY
  const orderM = n.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
  // LIMIT
  const limitM = n.match(/LIMIT\s+(\d+|\?)/i);
  const limitVal = limitM ? (limitM[1] === '?' ? params[params.length - 1] : parseInt(limitM[1])) : null;

  if (isCount) {
    return withRetry(async () => {
      let q = s.from(table).select('*', { count: 'exact', head: true });
      q = applyWhere(q, conditions);
      const { count, error } = await q;
      if (error) throw new Error(error.message);
      const row: any = {}; row[countAlias!] = count ?? 0;
      return single ? row : [row];
    }, `COUNT ${table}`);
  }

  if (isAvg) {
    return withRetry(async () => {
      let q = s.from(table).select(avgCol!);
      q = applyWhere(q, conditions);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      const vals = (data || []).map((r: any) => r[avgCol!]).filter((v: any) => v != null);
      const avg = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
      const row: any = {}; row[avgAlias!] = avg;
      return single ? row : [row];
    }, `AVG ${table}`);
  }

  return withRetry(async () => {
    let q = s.from(table).select(cols === '*' ? '*' : cols);
    q = applyWhere(q, conditions);
    if (orderM) q = q.order(orderM[1], { ascending: (orderM[2] || 'ASC').toUpperCase() === 'ASC' });
    if (limitVal !== null) q = q.limit(limitVal);

    if (single) {
      const { data, error } = await q.maybeSingle();
      if (error) throw new Error(error.message);
      return data ?? null;
    } else {
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data ?? [];
    }
  }, `SELECT ${table}`);
}

/** Handle SELECT with JOIN */
async function pgSelectJoin(n: string, params: any[], single: boolean): Promise<any> {
  const s = getSupabase();
  // Pattern: COUNT ... FROM interviews i JOIN users u ON ... WHERE u.institution_id = ?
  const instId = params[0];

  if (/FROM\s+interviews.*JOIN\s+users/i.test(n)) {
    // Get user IDs with this institution_id
    const { data: users } = await s.from('users').select('id').eq('institution_id', instId);
    const userIds = (users || []).map((u: any) => u.id);
    if (!userIds.length) {
      if (/AVG\s*\(/i.test(n)) return single ? { avg: null } : [{ avg: null }];
      return single ? { count: 0 } : [{ count: 0 }];
    }

    const needCompleted = /i\.completed\s*=\s*1/i.test(n);
    const colsM = n.match(/^SELECT\s+(.+?)\s+FROM/i);
    const cols = colsM?.[1] ?? '*';
    const isCount = /COUNT/i.test(cols);
    const isAvg = /AVG/i.test(cols);
    const avgCol = n.match(/AVG\s*\(\s*(\w+)\s*\)/i)?.[1] ?? 'score';

    let q = s.from('interviews').select(isAvg ? avgCol : '*').in('user_id', userIds);
    if (needCompleted) q = q.eq('completed', 1);
    const { data, count, error } = await (isCount ? q.select('*', { count: 'exact', head: true }) : q);
    if (error) throw new Error(error.message);

    if (isCount) {
      return single ? { count } : [{ count }];
    }
    if (isAvg) {
      const vals = (data || []).map((r: any) => r[avgCol]).filter((v: any) => v != null);
      const avg = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
      return single ? { avg } : [{ avg }];
    }
    return single ? (data?.[0] ?? null) : (data ?? []);
  }

  // Admin institutions with student_count subquery (handled in pgSelectSubquery)
  console.warn('[DB] Unhandled JOIN query:', n.slice(0, 100));
  return single ? null : [];
}

/** Handle SELECT with subqueries in SELECT list */
async function pgSelectSubquery(n: string, params: any[]): Promise<any> {
  const s = getSupabase();

  // Institution admin: SELECT i.*, (SELECT COUNT(*) FROM users WHERE institution_id = i.id) as student_count
  if (/FROM\s+institutions\s+i/i.test(n)) {
    // Single query for institutions + ONE batched count query (not N+1)
    const [{ data: insts, error }, { data: counts, error: e2 }] = await Promise.all([
      s.from('institutions').select('*').order('created_at', { ascending: false }),
      s.from('users').select('institution_id').not('institution_id', 'is', null),
    ]);
    if (error) throw new Error(error.message);
    if (e2) throw new Error(e2.message);
    // Aggregate counts in JS — zero HTTP overhead
    const countMap: Record<string, number> = {};
    for (const u of (counts || [])) {
      if (u.institution_id) countMap[u.institution_id] = (countMap[u.institution_id] || 0) + 1;
    }
    return (insts || []).map((inst: any) => ({ ...inst, student_count: countMap[inst.id] ?? 0 }));
  }

  // Students with interview stats — batched (not N+1 per student)
  if (/FROM\s+users/i.test(n)) {
    const instId = params[0];
    // 3 parallel queries instead of 2×N+1
    const [{ data: users, error }, { data: allInterviews, error: e2 }] = await Promise.all([
      s.from('users')
        .select('id, email, name, student_category, target_role, created_at')
        .eq('institution_id', instId)
        .eq('user_type', 'student')
        .order('created_at', { ascending: false }),
      s.from('interviews').select('user_id, score, completed').not('user_id', 'is', null),
    ]);
    if (error) throw new Error(error.message);
    if (e2) throw new Error(e2.message);

    // Build maps in JS — no extra HTTP calls
    const interviewCountMap: Record<string, number> = {};
    const scoreListMap: Record<string, number[]> = {};
    for (const iv of (allInterviews || [])) {
      interviewCountMap[iv.user_id] = (interviewCountMap[iv.user_id] || 0) + 1;
      if (iv.completed === 1 && iv.score != null) {
        if (!scoreListMap[iv.user_id]) scoreListMap[iv.user_id] = [];
        scoreListMap[iv.user_id].push(iv.score);
      }
    }
    return (users || []).map((u: any) => {
      const scores = scoreListMap[u.id] || [];
      const avg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null;
      return { ...u, interview_count: interviewCountMap[u.id] ?? 0, avg_score: avg };
    });
  }

  console.warn('[DB] Unhandled subquery:', n.slice(0, 100));
  return [];
}

/** Handle GROUP BY queries */
async function pgSelectGroupBy(n: string, params: any[]): Promise<any[]> {
  const s = getSupabase();

  // student_category breakdown — single query, aggregate in JS
  if (/GROUP\s+BY\s+student_category/i.test(n)) {
    const instId = params[0];
    const { data, error } = await s.from('users').select('student_category').eq('institution_id', instId).not('student_category', 'is', null);
    if (error) throw new Error(error.message);
    const map: Record<string, number> = {};
    for (const u of (data || [])) { map[u.student_category] = (map[u.student_category] || 0) + 1; }
    return Object.entries(map).map(([student_category, count]) => ({ student_category, count }));
  }

  // Top performers — batched: fetch all users + their interviews in 2 parallel queries
  if (/GROUP\s+BY\s+u\.id/i.test(n)) {
    const instId = params[0];
    const [{ data: users, error }, { data: interviews, error: e2 }] = await Promise.all([
      s.from('users').select('id, name, email').eq('institution_id', instId),
      s.from('interviews').select('user_id, score').eq('completed', 1).not('score', 'is', null),
    ]);
    if (error) throw new Error(error.message);
    if (e2) throw new Error(e2.message);

    // Build score map in JS
    const scoreMap: Record<string, number[]> = {};
    for (const iv of (interviews || [])) {
      if (!scoreMap[iv.user_id]) scoreMap[iv.user_id] = [];
      scoreMap[iv.user_id].push(iv.score);
    }
    const result = (users || []).map((u: any) => {
      const vals = scoreMap[u.id] || [];
      const avg_score = vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : null;
      return { ...u, avg_score, interview_count: vals.length };
    });
    return result.sort((a: any, b: any) => (b.avg_score ?? -1) - (a.avg_score ?? -1)).slice(0, 5);
  }

  // role/role_name/activity_type GROUP BY — simple aggregations
  const groupM = n.match(/GROUP\s+BY\s+(\w+)/i);
  const tableM = n.match(/FROM\s+(\w+)/i);
  const countAliasM = n.match(/COUNT\s*\(\*\)\s+as\s+(\w+)/i);
  if (groupM && tableM) {
    const groupCol = groupM[1];
    const table = tableM[1];
    const countAlias = countAliasM?.[1] ?? 'cnt';
    const selectColsM = n.match(/^SELECT\s+(.+?)\s+FROM/i);
    const selectCols = selectColsM?.[1] ?? '*';
    const nameColM = selectCols.match(/^(\w+),/);
    const nameCol = nameColM?.[1] ?? groupCol;

    const { data, error } = await s.from(table).select(nameCol === groupCol ? groupCol : `${nameCol}, ${groupCol}`);
    if (error) throw new Error(error.message);
    const map: Record<string, number> = {};
    for (const r of (data || [])) { const k = r[groupCol] || 'Unknown'; map[k] = (map[k] || 0) + 1; }
    return Object.entries(map).map(([key, cnt]) => ({ [groupCol]: key, [countAlias]: cnt }));
  }

  console.warn('[DB] Unhandled GROUP BY:', n.slice(0, 100));
  return [];
}

// -------- INSERT --------
async function pgInsert(sql: string, params: any[]): Promise<{ changes: number }> {
  const s = getSupabase();
  const n = norm(sql);

  const tableM = n.match(/INTO\s+(\w+)\s*\(/i);
  if (!tableM) throw new Error('No table in INSERT: ' + n.slice(0, 80));
  const table = tableM[1];

  const colsM = n.match(/\(([^)]+)\)\s*VALUES/i);
  if (!colsM) throw new Error('No columns in INSERT: ' + n.slice(0, 80));
  const cols = colsM[1].split(',').map((c: string) => c.trim());

  const valuesM = n.match(/VALUES\s*\((.+)\)\s*$/i);
  if (!valuesM) throw new Error('No VALUES in INSERT: ' + n.slice(0, 80));
  const valTokens = splitSetClauses(valuesM[1]);

  const isIgnore = /INSERT\s+OR\s+IGNORE/i.test(n) || /INSERT\s+OR\s+REPLACE/i.test(n);
  const row: any = {};
  let pi = 0;

  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    const token = (valTokens[i] || '').trim();
    if (token === '?') { row[col] = params[pi++] ?? null; }
    else if (/^datetime\('now'\)$/i.test(token)) { row[col] = new Date().toISOString(); }
    else if (/^'(.*)'$/.test(token)) { row[col] = token.slice(1, -1); }
    else if (/^\d+$/.test(token)) { row[col] = parseInt(token); }
    else if (token === 'NULL') { row[col] = null; }
    else { row[col] = params[pi++] ?? null; }

    if (BOOLEAN_COLS.has(col.toLowerCase())) {
      if (row[col] === 0 || row[col] === '0') row[col] = false;
      else if (row[col] === 1 || row[col] === '1') row[col] = true;
    }
  }

  return withRetry(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let error: any;
    if (isIgnore) {
      ({ error } = await s.from(table).upsert(row, { onConflict: 'id', ignoreDuplicates: false }));
      if (error && (error.code === '23505' || error.code === '409')) return { changes: 0 };
    } else {
      ({ error } = await s.from(table).insert(row));
    }
    if (error) throw new Error(error.message);
    return { changes: 1 };
  }, `INSERT ${table}`);
}

// -------- UPDATE --------
async function pgUpdate(sql: string, params: any[]): Promise<{ changes: number }> {
  const s = getSupabase();
  const n = norm(sql);

  const tableM = n.match(/^UPDATE\s+(\w+)\s+SET/i);
  if (!tableM) throw new Error('No table in UPDATE: ' + n.slice(0, 80));
  const table = tableM[1];

  const setM = n.match(/SET\s+(.+?)\s+WHERE/i);
  if (!setM) throw new Error('No SET in UPDATE: ' + n.slice(0, 80));
  const setStr = setM[1];

  const whereM = n.match(/WHERE\s+(.+)$/i);
  const whereStr = whereM ? whereM[1].trim() : '';

  const setItems = splitSetClauses(setStr);
  let pi = 0;
  const updates: any = {};

  for (const item of setItems) {
    const eqP = item.match(/^(\w+)\s*=\s*\?$/);
    if (eqP) { updates[eqP[1]] = params[pi++]; continue; }
    const eqDt = item.match(/^(\w+)\s*=\s*datetime\('now'\)/i);
    if (eqDt) { updates[eqDt[1]] = new Date().toISOString(); continue; }
    const incr = item.match(/^(\w+)\s*=\s*(\w+)\s*\+\s*(\d+)$/);
    if (incr && incr[1] === incr[2]) { updates['__incr__' + incr[1]] = parseInt(incr[3]); continue; }
    const eqStr = item.match(/^(\w+)\s*=\s*'([^']*)'$/);
    if (eqStr) { updates[eqStr[1]] = eqStr[2]; continue; }
    const eqNum = item.match(/^(\w+)\s*=\s*(\d+)$/);
    if (eqNum) { updates[eqNum[1]] = parseInt(eqNum[2]); continue; }
    console.warn('[DB] SET clause not parsed:', item);
  }

  for (const key of Object.keys(updates)) {
    if (BOOLEAN_COLS.has(key.toLowerCase())) {
      if (updates[key] === 0 || updates[key] === '0') updates[key] = false;
      else if (updates[key] === 1 || updates[key] === '1') updates[key] = true;
    }
  }

  const [conditions] = parseWhere(whereStr, params, pi);

  return withRetry(async () => {
    // Handle self-increment columns
    const incrCols = Object.keys(updates).filter(k => k.startsWith('__incr__'));
    if (incrCols.length) {
      let fetchQ = s.from(table).select(incrCols.map(k => k.replace('__incr__', '')).join(','));
      fetchQ = applyWhere(fetchQ, conditions);
      const { data: current } = await fetchQ.maybeSingle();
      for (const key of incrCols) {
        const col = key.replace('__incr__', '');
        updates[col] = ((current?.[col] ?? 0) as number) + (updates[key] as number);
        delete updates[key];
      }
    }
    let q = s.from(table).update(updates);
    q = applyWhere(q, conditions);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { changes: 1 };
  }, `UPDATE ${table}`);
}

/** Split SET clauses by comma — handles nested commas in strings */
function splitSetClauses(setStr: string): string[] {
  const items: string[] = [];
  let current = '';
  let depth = 0;
  for (const ch of setStr) {
    if (ch === '(' ) depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) { items.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

// -------- DELETE --------
async function pgDelete(sql: string, params: any[]): Promise<{ changes: number }> {
  const s = getSupabase();
  const n = norm(sql);
  const table = extractTable(n, 'FROM');
  const whereM = n.match(/WHERE\s+(.+)$/i);
  const whereStr = whereM ? whereM[1].trim() : '';
  const [conditions] = parseWhere(whereStr, params, 0);
  return withRetry(async () => {
    let q = s.from(table).delete();
    q = applyWhere(q, conditions);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { changes: 1 };
  }, `DELETE ${table}`);
}

// -------- Main dispatch --------
async function pgGet(sql: string, params: any[]): Promise<any> {
  const n = norm(sql);
  if (/^SELECT/i.test(n)) return pgSelect(sql, params, true);
  throw new Error('pgGet called with non-SELECT: ' + n.slice(0, 80));
}

async function pgAll(sql: string, params: any[]): Promise<any[]> {
  const n = norm(sql);
  if (/^SELECT/i.test(n)) return pgSelect(sql, params, false);
  throw new Error('pgAll called with non-SELECT: ' + n.slice(0, 80));
}

async function pgRun(sql: string, params: any[]): Promise<{ changes: number }> {
  const n = norm(sql);
  if (/^INSERT/i.test(n)) return pgInsert(sql, params);
  if (/^UPDATE/i.test(n)) return pgUpdate(sql, params);
  if (/^DELETE/i.test(n)) return pgDelete(sql, params);
  throw new Error('Unsupported SQL op: ' + n.slice(0, 80));
}

// ==================== UNIFIED INTERFACE ====================
export const DB = {
  get: async <T = any>(sql: string, params: any[] = []): Promise<T | null> => {
    if (DB_TYPE === 'supabase') return pgGet(sql, params);
    return sqliteGet(sql, params);
  },
  all: async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
    if (DB_TYPE === 'supabase') return pgAll(sql, params);
    return sqliteAll(sql, params);
  },
  run: async (sql: string, params: any[] = []): Promise<{ changes: number }> => {
    if (DB_TYPE === 'supabase') return pgRun(sql, params);
    return sqliteRun(sql, params);
  },
  type: DB_TYPE,
};

export default DB;
