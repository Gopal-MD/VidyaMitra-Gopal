/**
 * Transform script: converts all db.prepare().get/all/run() calls in apiServer.ts
 * to the unified async DB.get/all/run() interface.
 *
 * Run: npx tsx scripts/transformApiServer.ts
 */
import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { resolve } from 'path';

const srcPath = resolve(process.cwd(), 'server/apiServer.ts');
const bakPath = resolve(process.cwd(), 'server/apiServer.ts.bak2');

// Backup first
copyFileSync(srcPath, bakPath);
console.log('✅ Backup created:', bakPath);

let code = readFileSync(srcPath, 'utf8');
const original = code;

// ── Pass 1: Add DB import at top ──────────────────────────────────────────────
if (!code.includes("from './database.js'")) {
  code = code.replace(
    /import \{ getDb[^}]* \} from '\.\/db\.js'/,
    m => m + "\nimport { DB } from './database.js'"
  );
  console.log('✅ Added DB import');
}

// ── Pass 2: Remove standalone `const db = getDb();` lines ────────────────────
// These are lines that only do `const db = getDb();` and nothing else
let removedDb = 0;
code = code.replace(/^[ \t]*const db = getDb\(\);[ \t]*\r?\n/gm, () => {
  removedDb++;
  return '';
});
console.log(`✅ Removed ${removedDb} standalone const db = getDb() lines`);

// ── Pass 3: Transform db.prepare(EXPR).METHOD(PARAMS) ────────────────────────
//
// Strategy: scan for `db.prepare(` and find the matching closing ), then
// find the method call, then find the closing ) of params.
// Replace the whole thing with `await DB.METHOD(EXPR, [PARAMS])`
//
// This handles multi-line template literals correctly.

let transformed = 0;

function transformPrepares(src: string): string {
  let result = '';
  let i = 0;

  while (i < src.length) {
    const marker = 'db.prepare(';
    const idx = src.indexOf(marker, i);
    if (idx === -1) {
      result += src.slice(i);
      break;
    }

    // Copy everything before this occurrence
    result += src.slice(i, idx);

    // Now parse db.prepare(SQLEXPR).METHOD(PARAMS)
    let pos = idx + marker.length; // pos is at char after 'db.prepare('

    // Find matching closing ) for the prepare call — handles nested parens / template literals
    const [sqlExpr, afterSql] = extractBalancedExpr(src, pos);
    if (afterSql === -1) {
      // Couldn't parse — copy as-is
      result += src.slice(idx, idx + marker.length);
      i = idx + marker.length;
      continue;
    }

    // afterSql points to char after the closing ) of prepare(...)
    // Expect a dot followed by method name
    let p = afterSql;
    // Skip optional whitespace/newlines
    while (p < src.length && /[\s]/.test(src[p])) p++;

    if (src[p] !== '.') {
      // No method call — copy as-is
      result += 'db.prepare(' + sqlExpr;
      i = afterSql;
      continue;
    }
    p++; // skip the dot

    const methodMatch = src.slice(p).match(/^(get|all|run)\s*\(/);
    if (!methodMatch) {
      // Not get/all/run — copy as-is
      result += 'db.prepare(' + sqlExpr + ')';
      i = afterSql;
      continue;
    }
    const method = methodMatch[1];
    p += method.length + 1; // skip "METHOD("

    // Extract params
    const [paramsExpr, afterParams] = extractBalancedExpr(src, p, ')');
    if (afterParams === -1) {
      result += 'db.prepare(' + sqlExpr + ').' + method + '(';
      i = p;
      continue;
    }

    // Build replacement
    const params = paramsExpr.trim();
    const argsArr = params.length === 0 ? '[]' : '[' + params + ']';
    const replacement = `await DB.${method}(${sqlExpr}, ${argsArr})`;

    result += replacement;
    i = afterParams;
    transformed++;
  }

  return result;
}

/**
 * From position `start` in `src`, extract a balanced expression that ends when the
 * nesting depth returns to 0. The opening delimiter is the character AT `start - 1`
 * (already consumed). Returns [content, posAfterClosing].
 *
 * Handles:
 *  - Nested ()
 *  - Template literals `...${...}...`
 *  - Single-quoted strings '...'
 *  - Double-quoted strings "..."
 *  - Line comments //
 *  - Block comments /* ... *\/
 */
function extractBalancedExpr(src: string, start: number, closing = ')'): [string, number] {
  const opening = closing === ')' ? '(' : closing;
  let depth = 1;
  let i = start;
  let content = '';

  while (i < src.length) {
    const ch = src[i];

    // Template literal
    if (ch === '`') {
      const [tlContent, after] = extractTemplateLiteral(src, i + 1);
      content += '`' + tlContent + '`';
      i = after + 1;
      continue;
    }
    // Single-quoted string
    if (ch === "'") {
      const [sqContent, after] = extractString(src, i + 1, "'");
      content += "'" + sqContent + "'";
      i = after + 1;
      continue;
    }
    // Double-quoted string
    if (ch === '"') {
      const [dqContent, after] = extractString(src, i + 1, '"');
      content += '"' + dqContent + '"';
      i = after + 1;
      continue;
    }
    // Line comment
    if (ch === '/' && src[i + 1] === '/') {
      const end = src.indexOf('\n', i);
      const endPos = end === -1 ? src.length : end;
      content += src.slice(i, endPos);
      i = endPos;
      continue;
    }
    // Block comment
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const endPos = end === -1 ? src.length : end + 2;
      content += src.slice(i, endPos);
      i = endPos;
      continue;
    }

    if (closing === ')' && ch === '(') depth++;
    if (ch === closing) {
      depth--;
      if (depth === 0) return [content, i + 1];
    }
    content += ch;
    i++;
  }
  return [content, -1]; // unbalanced
}

function extractTemplateLiteral(src: string, start: number): [string, number] {
  let content = '';
  let i = start;
  while (i < src.length) {
    if (src[i] === '\\') { content += src[i] + src[i + 1]; i += 2; continue; }
    if (src[i] === '$' && src[i + 1] === '{') {
      const [inner, after] = extractBalancedExpr(src, i + 2, '}');
      content += '${' + inner + '}';
      // after points past the }... but we need to handle depth=0 close
      // Actually extractBalancedExpr with `}` will find the matching }
      i = after;
      continue;
    }
    if (src[i] === '`') return [content, i];
    content += src[i++];
  }
  return [content, i];
}

function extractString(src: string, start: number, quote: string): [string, number] {
  let content = '';
  let i = start;
  while (i < src.length) {
    if (src[i] === '\\') { content += src[i] + src[i + 1]; i += 2; continue; }
    if (src[i] === quote) return [content, i];
    content += src[i++];
  }
  return [content, i];
}

code = transformPrepares(code);
console.log(`✅ Transformed ${transformed} db.prepare() calls`);

// ── Pass 4: Fix up remaining `const db = getDb()` that might be left (inline) ─
// Convert `const db = getDb()` that survived (as part of multi-stmt lines) 
// Actually these should be removed — if they're still there, something was missed
const remaining = (code.match(/db\.prepare/g) || []).length;
if (remaining > 0) {
  console.warn(`⚠️  ${remaining} db.prepare() occurrences still remain — check manually`);
} else {
  console.log('✅ All db.prepare() calls transformed');
}

// ── Pass 5: Clean up getDb import if no longer used ───────────────────────────
const getDbUsages = (code.match(/\bgetDb\b/g) || []).length;
console.log(`ℹ️  getDb still appears ${getDbUsages} time(s) in the file`);
// We keep getDb import since db.ts still exports it and SQLite mode uses it via database.ts

// ── Write result ──────────────────────────────────────────────────────────────
if (code !== original) {
  writeFileSync(srcPath, code, 'utf8');
  console.log('✅ apiServer.ts written successfully');
} else {
  console.log('⚠️  No changes were made — check if patterns matched');
}

console.log('\n─── Summary ───────────────────────────────────────────');
console.log(`Transformed: ${transformed} db.prepare() calls`);
console.log(`Remaining:   ${remaining} db.prepare() calls`);
console.log(`Backup:      server/apiServer.ts.bak2`);
