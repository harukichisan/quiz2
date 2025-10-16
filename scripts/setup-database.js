#!/usr/bin/env node

/**
 * Supabaseデータベースセットアップスクリプト
 * バトルモード用のテーブルとポリシーを作成
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数から接続情報を取得
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
console.log(`   URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupDatabase() {
  try {
    console.log('\n📋 Step 1: Reading SQL files...');

    // SQLファイルを読み込み
    const setupSQL = readFileSync(
      join(__dirname, '../supabase-battle-mode-setup.sql'),
      'utf-8'
    );
    const fixRLSSQL = readFileSync(
      join(__dirname, '../supabase-fix-rls.sql'),
      'utf-8'
    );

    console.log('✅ SQL files loaded successfully\n');

    console.log('⚠️  Important Note:');
    console.log('   Anonymous key cannot execute DDL statements (CREATE TABLE, etc.)');
    console.log('   You need to run these SQL files manually in Supabase Dashboard:\n');
    console.log('   1. Go to: https://supabase.com/dashboard');
    console.log('   2. Select your project');
    console.log('   3. Navigate to: SQL Editor');
    console.log('   4. Copy and paste the content of:');
    console.log('      - supabase-battle-mode-setup.sql');
    console.log('      - supabase-fix-rls.sql');
    console.log('   5. Click "Run" for each file\n');

    console.log('📝 SQL files to execute:');
    console.log(`   1. supabase-battle-mode-setup.sql (${setupSQL.split('\n').length} lines)`);
    console.log(`   2. supabase-fix-rls.sql (${fixRLSSQL.split('\n').length} lines)\n`);

    // 接続テスト
    console.log('🔍 Testing connection...');
    const { data, error } = await supabase
      .from('questions')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection test failed:', error.message);
    } else {
      console.log('✅ Connection successful!');
      console.log('   Questions table is accessible\n');
    }

    console.log('💡 Alternative: Use Supabase CLI');
    console.log('   If you have database password, you can use:');
    console.log('   npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupDatabase();
