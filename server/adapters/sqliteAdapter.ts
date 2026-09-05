/**
 * SQLite Adapter - Wraps existing SQLite database
 * Provides compatibility layer for abstraction interface
 */

import { getDb } from '../db';
import type { DbAdapter, PreparedStatement } from '../dbAdapter';
import Database from 'better-sqlite3';

export class SqliteAdapter implements DbAdapter {
  private db: Database.Database;

  constructor() {
    this.db = getDb();
    console.log('✅ SQLite adapter initialized');
  }

  getRawDb(): Database.Database {
    return this.db;
  }

  prepare(sql: string): PreparedStatement {
    const stmt = this.db.prepare(sql);
    
    // Wrap SQLite statement to match interface
    return {
      get: (...params: any[]) => stmt.get(...params),
      all: (...params: any[]) => stmt.all(...params),
      run: (...params: any[]) => stmt.run(...params)
    };
  }

  isSupabase(): boolean {
    return false;
  }

  isSqlite(): boolean {
    return true;
  }
}
