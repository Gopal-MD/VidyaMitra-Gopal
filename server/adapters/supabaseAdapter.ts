/**
 * Supabase Adapter - Implements database operations using Supabase
 * Translates SQLite-style queries to Supabase/PostgreSQL
 * 
 * Note: This adapter uses 'any' types for flexibility with dynamic SQL operations
 * eslint-disable @typescript-eslint/no-explicit-any
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseClient } from '../supabase';
import type { DbAdapter, PreparedStatement } from '../dbAdapter';
import type { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseAdapter implements DbAdapter {
  private client: SupabaseClient;

  constructor() {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
    this.client = client;
    console.log('✅ Supabase adapter initialized');
  }

  getRawDb(): SupabaseClient {
    return this.client;
  }

  /**
   * Emulates SQLite's prepare() interface
   * Parses SQL and creates a PreparedStatement-like object
   * Note: Returns async methods - calling code must await results
   */
  prepare(sql: string): PreparedStatement {
    return new SupabasePreparedStatement(this.client, sql) as unknown as PreparedStatement;
  }

  isSupabase(): boolean {
    return true;
  }

  isSqlite(): boolean {
    return false;
  }
}

/**
 * Translates SQLite prepared statements to Supabase queries
 * Note: Methods are async but cast to sync interface for compatibility
 */
class SupabasePreparedStatement {
  private client: SupabaseClient;
  private sql: string;

  constructor(client: SupabaseClient, sql: string) {
    this.client = client;
    this.sql = sql.trim();
  }

  /**
   * Execute query and return single row
   */
  async get(...params: any[]): Promise<any> {
    const result = await this.executeQuery(params);
    return result && result.length > 0 ? result[0] : null;
  }

  /**
   * Execute query and return all rows
   */
  async all(...params: any[]): Promise<any[]> {
    return await this.executeQuery(params);
  }

  /**
   * Execute INSERT/UPDATE/DELETE and return info
   */
  async run(...params: any[]): Promise<any> {
    return await this.executeQuery(params);
  }

  /**
   * Parse and execute SQL query using Supabase
   */
  private async executeQuery(params: any[]): Promise<any> {
    try {
      // Parse SQL statement
      const parsed = this.parseSQL(this.sql, params);
      
      if (parsed.type === 'SELECT') {
        return await this.executeSelect(parsed);
      } else if (parsed.type === 'INSERT') {
        return await this.executeInsert(parsed);
      } else if (parsed.type === 'UPDATE') {
        return await this.executeUpdate(parsed);
      } else if (parsed.type === 'DELETE') {
        return await this.executeDelete(parsed);
      } else if (parsed.type === 'COUNT') {
        return await this.executeCount(parsed);
      } else {
        throw new Error(`Unsupported SQL operation: ${parsed.type}`);
      }
    } catch (error) {
      console.error('❌ Supabase query error:', error);
      console.error('SQL:', this.sql);
      console.error('Params:', params);
      throw error;
    }
  }

  /**
   * Parse SQL statement into components
   */
  private parseSQL(sql: string, params: any[]): any {
    const sqlUpper = sql.toUpperCase();
    
    // Detect operation type
    if (sqlUpper.startsWith('SELECT COUNT')) {
      return this.parseCount(sql, params);
    } else if (sqlUpper.startsWith('SELECT')) {
      return this.parseSelect(sql, params);
    } else if (sqlUpper.startsWith('INSERT')) {
      return this.parseInsert(sql, params);
    } else if (sqlUpper.startsWith('UPDATE')) {
      return this.parseUpdate(sql, params);
    } else if (sqlUpper.startsWith('DELETE')) {
      return this.parseDelete(sql, params);
    }

    return { type: 'UNKNOWN', sql, params };
  }

  /**
   * Parse SELECT statement
   */
  private parseSelect(sql: string, params: any[]): any {
    // Extract table name
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    const table = fromMatch ? fromMatch[1] : null;

    // Extract WHERE clause
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|$)/i);
    const where = whereMatch ? whereMatch[1].trim() : null;

    // Extract ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(.+?)(?:LIMIT|$)/i);
    const orderBy = orderMatch ? orderMatch[1].trim() : null;

    // Extract LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : null;

    // Extract columns (everything between SELECT and FROM)
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/i);
    const columns = selectMatch ? selectMatch[1].trim() : '*';

    return {
      type: 'SELECT',
      table,
      columns,
      where,
      orderBy,
      limit,
      params
    };
  }

  /**
   * Parse INSERT statement
   */
  private parseInsert(sql: string, params: any[]): any {
    const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : null;

    const columnsMatch = sql.match(/\(([^)]+)\)/);
    const columns = columnsMatch ? columnsMatch[1].split(',').map(c => c.trim()) : [];

    return {
      type: 'INSERT',
      table,
      columns,
      params
    };
  }

  /**
   * Parse UPDATE statement
   */
  private parseUpdate(sql: string, params: any[]): any {
    const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : null;

    const setMatch = sql.match(/SET\s+(.+?)(?:WHERE|$)/i);
    const set = setMatch ? setMatch[1].trim() : null;

    const whereMatch = sql.match(/WHERE\s+(.+)$/i);
    const where = whereMatch ? whereMatch[1].trim() : null;

    return {
      type: 'UPDATE',
      table,
      set,
      where,
      params
    };
  }

  /**
   * Parse DELETE statement
   */
  private parseDelete(sql: string, params: any[]): any {
    const tableMatch = sql.match(/DELETE FROM\s+(\w+)/i);
    const table = tableMatch ? tableMatch[1] : null;

    const whereMatch = sql.match(/WHERE\s+(.+)$/i);
    const where = whereMatch ? whereMatch[1].trim() : null;

    return {
      type: 'DELETE',
      table,
      where,
      params
    };
  }

  /**
   * Parse COUNT statement
   */
  private parseCount(sql: string, params: any[]): any {
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    const table = fromMatch ? fromMatch[1] : null;

    const whereMatch = sql.match(/WHERE\s+(.+?)(?:GROUP BY|ORDER BY|$)/i);
    const where = whereMatch ? whereMatch[1].trim() : null;

    return {
      type: 'COUNT',
      table,
      where,
      params
    };
  }

  /**
   * Execute SELECT query
   */
  private async executeSelect(parsed: any): Promise<any[]> {
    let query = this.client.from(parsed.table).select(parsed.columns === '*' ? '*' : parsed.columns);

    // Apply WHERE clause
    if (parsed.where) {
      query = this.applyWhereClause(query, parsed.where, parsed.params);
    }

    // Apply ORDER BY
    if (parsed.orderBy) {
      const [column, direction] = parsed.orderBy.split(/\s+/);
      query = query.order(column, { ascending: direction?.toUpperCase() !== 'DESC' });
    }

    // Apply LIMIT
    if (parsed.limit) {
      query = query.limit(parsed.limit);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Execute COUNT query
   */
  private async executeCount(parsed: any): Promise<any[]> {
    let query = this.client.from(parsed.table).select('*', { count: 'exact', head: true });

    // Apply WHERE clause
    if (parsed.where) {
      query = this.applyWhereClause(query, parsed.where, parsed.params);
    }

    const { count, error } = await query;
    
    if (error) throw error;
    return [{ count: count || 0 }];
  }

  /**
   * Execute INSERT query
   */
  private async executeInsert(parsed: any): Promise<any> {
    const data: any = {};
    parsed.columns.forEach((col: string, i: number) => {
      data[col] = parsed.params[i];
    });

    const { error } = await this.client.from(parsed.table).insert(data);
    
    if (error) throw error;
    return { changes: 1, lastInsertRowid: data.id };
  }

  /**
   * Execute UPDATE query
   */
  private async executeUpdate(parsed: any): Promise<any> {
    // Parse SET clause to build update object
    const updates: any = {};
    const setParts = parsed.set.split(',');
    let paramIndex = 0;

    setParts.forEach((part: string) => {
      const [column] = part.split('=').map(s => s.trim());
      updates[column] = parsed.params[paramIndex++];
    });

    let query = this.client.from(parsed.table).update(updates);

    // Apply WHERE clause with remaining params
    if (parsed.where) {
      const whereParams = parsed.params.slice(paramIndex);
      query = this.applyWhereClause(query, parsed.where, whereParams);
    }

    const { error } = await query;
    
    if (error) throw error;
    return { changes: 1 };
  }

  /**
   * Execute DELETE query
   */
  private async executeDelete(parsed: any): Promise<any> {
    let query = this.client.from(parsed.table).delete();

    // Apply WHERE clause
    if (parsed.where) {
      query = this.applyWhereClause(query, parsed.where, parsed.params);
    }

    const { error } = await query;
    
    if (error) throw error;
    return { changes: 1 };
  }

  /**
   * Apply WHERE clause to Supabase query
   */
  private applyWhereClause(query: any, where: string, params: any[]): any {
    // Simple WHERE parsing (handles basic cases)
    // Format: "column = ?" or "column1 = ? AND column2 = ?"
    
    let paramIndex = 0;
    const conditions = where.split(/\s+AND\s+/i);

    conditions.forEach((condition: string) => {
      if (condition.includes('=')) {
        const [column] = condition.split('=').map(s => s.trim());
        const value = params[paramIndex++];
        query = query.eq(column, value);
      } else if (condition.includes('>')) {
        const [column] = condition.split('>').map(s => s.trim());
        const value = params[paramIndex++];
        query = query.gt(column, value);
      } else if (condition.includes('<')) {
        const [column] = condition.split('<').map(s => s.trim());
        const value = params[paramIndex++];
        query = query.lt(column, value);
      }
    });

    return query;
  }
}
