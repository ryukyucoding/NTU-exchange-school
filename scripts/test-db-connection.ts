/**
 * 測試 Supabase 資料庫連接和表結構
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// 手動載入 .env.local
const env: Record<string, string> = {};
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        env[key] = value;
      }
    }
  });
} catch (error) {
  console.warn('⚠️  無法讀取 .env.local 文件');
  process.exit(1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少必要的環境變數！');
  console.error('需要: NEXT_PUBLIC_SUPABASE_URL');
  console.error('需要: SUPABASE_SERVICE_ROLE_KEY 或 NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

if (env.SUPABASE_SERVICE_ROLE_KEY === 'your-service-role-key' || env.SUPABASE_SERVICE_ROLE_KEY?.includes('your-')) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY 似乎是占位符，請設置正確的 Service Role Key');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testConnection() {
  try {
    console.log('🔍 測試 Supabase 連接...');
    console.log(`📍 URL: ${supabaseUrl}`);
    console.log(`🔑 使用 ${env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key' : 'Anon Key'}\n`);
    
    // 測試查詢 User 表
    console.log('📋 檢查 User 表...');
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('*')
      .limit(5);
    
    if (userError) {
      console.error('❌ User 表查詢錯誤:', userError.message);
      console.error('錯誤代碼:', userError.code);
      if (userError.code === '42P01') {
        console.error('💡 提示: User 表不存在，請在 Supabase SQL Editor 中執行 supabase/auth-schema.sql');
      } else if (userError.code === '42501') {
        console.error('💡 提示: 權限不足，請使用 Service Role Key 而不是 Anon Key');
      } else if (userError.code === 'PGRST116') {
        console.error('💡 提示: 表存在但沒有數據');
      }
    } else {
      console.log('✅ User 表查詢成功');
      console.log(`📊 找到 ${users?.length || 0} 個用戶`);
      if (users && users.length > 0) {
        console.log('👤 用戶列表:');
        users.forEach(u => {
          console.log(`   - ${u.email} (${u.userID || '無 userID'})`);
        });
      }
    }
    
    // 測試查詢 Account 表
    console.log('\n📋 檢查 Account 表...');
    const { data: accounts, error: accountError } = await supabase
      .from('Account')
      .select('*')
      .limit(5);
    
    if (accountError) {
      console.error('❌ Account 表查詢錯誤:', accountError.message);
      console.error('錯誤代碼:', accountError.code);
      if (accountError.code === '42P01') {
        console.error('💡 提示: Account 表不存在，請在 Supabase SQL Editor 中執行 supabase/auth-schema.sql');
      }
    } else {
      console.log('✅ Account 表查詢成功');
      console.log(`📊 找到 ${accounts?.length || 0} 個帳號`);
      if (accounts && accounts.length > 0) {
        console.log('🔗 帳號列表:');
        accounts.forEach(a => {
          console.log(`   - ${a.provider} (${a.providerAccountId})`);
        });
      }
    }
    
    console.log('\n✅ 測試完成');
    console.log('\n💡 如果表不存在，請執行以下步驟:');
    console.log('   1. 前往 Supabase Dashboard → SQL Editor');
    console.log('   2. 執行 supabase/auth-schema.sql 文件中的 SQL');
    console.log('   3. 確保設置了正確的 SUPABASE_SERVICE_ROLE_KEY');
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    if (error instanceof Error) {
      console.error('錯誤堆疊:', error.stack);
    }
  }
}

testConnection();
