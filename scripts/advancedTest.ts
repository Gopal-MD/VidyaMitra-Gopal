/**
 * Advanced Supabase Connection Diagnostic
 * Tests connection with longer timeout and detailed error reporting
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

async function advancedTest() {
  console.log('🔍 Advanced Supabase Connection Test\n');
  console.log('=' .repeat(60));

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('\n📋 Configuration Check:');
  console.log('  URL:', url ? '✅ Present' : '❌ Missing');
  console.log('  Service Key:', key ? `✅ Present (${key.substring(0, 20)}...)` : '❌ Missing');
  console.log('  Full URL:', url);
  console.log();

  if (!url || !key) {
    console.log('❌ Missing credentials in .env file');
    return;
  }

  // Test 1: Basic URL reachability
  console.log('📡 Test 1: URL Reachability (60s timeout)');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });
    const elapsed = Date.now() - startTime;

    clearTimeout(timeoutId);

    console.log(`  ✅ URL reachable (${elapsed}ms)`);
    console.log(`  Status: ${response.status} ${response.statusText}`);
  } catch (error: any) {
    console.log(`  ❌ URL not reachable`);
    console.log(`  Error: ${error.message}`);
    console.log();
    console.log('🔧 Troubleshooting:');
    console.log('  1. Check Windows Firewall');
    console.log('  2. Try disabling antivirus temporarily');
    console.log('  3. Check if VPN is interfering');
    console.log('  4. Try from mobile hotspot');
    return;
  }

  console.log();

  // Test 2: Supabase Client with custom fetch
  console.log('📡 Test 2: Supabase Client Connection');
  try {
    // Create custom fetch with longer timeout
    const customFetch = async (url: any, options: any = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    const supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: customFetch
      }
    });

    console.log('  ⏳ Testing table query (may take 30-60 seconds)...');
    const startTime = Date.now();
    
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const elapsed = Date.now() - startTime;

    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log(`  ⚠️  Connection successful but tables don't exist (${elapsed}ms)`);
        console.log();
        console.log('📋 Next Step: Create Tables');
        console.log('  1. Open Supabase Dashboard > SQL Editor');
        console.log('  2. Copy ALL contents from: supabase/schema.sql');
        console.log('  3. Paste and click RUN');
        console.log('  4. Wait for "Success. No rows returned"');
        console.log('  5. Run: npm run check:supabase');
        return 'NEED_SCHEMA';
      } else {
        console.log(`  ❌ Query failed (${elapsed}ms)`);
        console.log(`  Error: ${error.message}`);
        console.log(`  Code: ${error.code}`);
        console.log(`  Details: ${error.details}`);
      }
    } else {
      console.log(`  ✅ Table query successful (${elapsed}ms)`);
      console.log(`  Row count: ${count}`);
      console.log();
      console.log('🎉 Supabase is fully working!');
      console.log();
      console.log('✅ You can now run migration:');
      console.log('   npm run migrate:dry-run');
      console.log('   npm run migrate');
      return 'SUCCESS';
    }

  } catch (error: any) {
    console.log(`  ❌ Client connection failed`);
    console.log(`  Error: ${error.message}`);
    
    if (error.name === 'AbortError') {
      console.log();
      console.log('⚠️  Timeout after 60 seconds');
      console.log();
      console.log('Possible causes:');
      console.log('  1. Firewall blocking Node.js network access');
      console.log('  2. Supabase region too far (high latency)');
      console.log('  3. ISP blocking Supabase domain');
      console.log();
      console.log('Try these:');
      console.log('  1. Add exception for Node.js in Windows Firewall');
      console.log('  2. Try: npm run migrate (might work despite test failing)');
      console.log('  3. Create project in closer region');
    }
  }
}

advancedTest();
