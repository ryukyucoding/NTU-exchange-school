/**
 * 檢查 Supabase 資料庫連接和所有表格
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
  console.error('❌ 無法讀取 .env.local 文件');
  console.error('💡 請確保 .env.local 文件存在並包含必要的環境變數');
  process.exit(1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少必要的環境變數！');
  console.error('需要: NEXT_PUBLIC_SUPABASE_URL');
  console.error('需要: SUPABASE_SERVICE_ROLE_KEY 或 NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('\n💡 請檢查 .env.local 文件');
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

// 要檢查的表格列表
const tablesToCheck = [
  { name: 'schools', description: '學校資料表' },
  { name: 'User', description: '用戶表' },
  { name: 'Account', description: '帳號表' },
  { name: 'Session', description: '會話表' },
  { name: 'VerificationToken', description: '驗證令牌表' },
  { name: 'user_qualifications', description: '用戶資格表' },
];

async function checkTable(tableName: string, description: string) {
  try {
    // 先嘗試獲取記錄數
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (countError) {
      if (countError.code === '42P01') {
        return { exists: false, count: 0, error: '表格不存在' };
      } else if (countError.code === '42501') {
        return { exists: true, count: null, error: '權限不足（可能需要 Service Role Key）' };
      } else {
        return { exists: true, count: null, error: countError.message };
      }
    }

    // 如果表格存在，嘗試獲取一筆資料來查看結構
    const { data, error: dataError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (dataError && dataError.code !== 'PGRST116') {
      return { exists: true, count: count || 0, error: dataError.message };
    }

    // 獲取欄位資訊（從第一筆資料推斷）
    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

    return {
      exists: true,
      count: count || 0,
      columns: columns,
      error: null,
    };
  } catch (error) {
    return {
      exists: false,
      count: 0,
      error: error instanceof Error ? error.message : '未知錯誤',
    };
  }
}

async function main() {
  console.log('🔍 檢查 Supabase 資料庫連接...\n');
  console.log('='.repeat(80));
  console.log(`📍 URL: ${supabaseUrl}`);
  console.log(`🔑 使用: ${env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key ✅' : 'Anon Key ⚠️'}`);
  console.log('='.repeat(80));
  console.log('');

  // 測試基本連接
  try {
    console.log('🔌 測試基本連接...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('schools')
      .select('id')
      .limit(1);

    if (healthError && healthError.code === '42P01') {
      console.log('⚠️  無法連接到資料庫或表格不存在');
    } else {
      console.log('✅ 連接成功！\n');
    }
  } catch (error) {
    console.log('❌ 連接失敗:', error instanceof Error ? error.message : '未知錯誤');
    console.log('\n💡 請檢查：');
    console.log('   1. NEXT_PUBLIC_SUPABASE_URL 是否正確');
    console.log('   2. SUPABASE_SERVICE_ROLE_KEY 或 NEXT_PUBLIC_SUPABASE_ANON_KEY 是否正確');
    console.log('   3. 網路連接是否正常');
    process.exit(1);
  }

  // 檢查每個表格
  console.log('📊 檢查表格狀態...\n');
  const results: Array<{ name: string; description: string; result: any }> = [];

  for (const table of tablesToCheck) {
    const result = await checkTable(table.name, table.description);
    results.push({ name: table.name, description: table.description, result });

    // 顯示結果
    if (!result.exists) {
      console.log(`❌ ${table.name} (${table.description})`);
      console.log(`   狀態: 表格不存在`);
      console.log(`   💡 提示: 請在 Supabase SQL Editor 中執行對應的 SQL 腳本\n`);
    } else if (result.error) {
      console.log(`⚠️  ${table.name} (${table.description})`);
      console.log(`   狀態: ${result.error}`);
      if (result.count !== null) {
        console.log(`   記錄數: ${result.count}`);
      }
      console.log('');
    } else {
      console.log(`✅ ${table.name} (${table.description})`);
      console.log(`   記錄數: ${result.count}`);
      if (result.columns && result.columns.length > 0) {
        console.log(`   欄位數: ${result.columns.length}`);
        console.log(`   欄位: ${result.columns.slice(0, 5).join(', ')}${result.columns.length > 5 ? '...' : ''}`);
      }
      console.log('');
    }
  }

  // 總結
  console.log('='.repeat(80));
  console.log('📋 總結：\n');

  const existingTables = results.filter(r => r.result.exists && !r.result.error);
  const missingTables = results.filter(r => !r.result.exists);
  const errorTables = results.filter(r => r.result.exists && r.result.error);

  console.log(`✅ 正常表格: ${existingTables.length}`);
  existingTables.forEach(r => {
    console.log(`   - ${r.name} (${r.result.count} 筆記錄)`);
  });

  if (missingTables.length > 0) {
    console.log(`\n❌ 缺失表格: ${missingTables.length}`);
    missingTables.forEach(r => {
      console.log(`   - ${r.name} (${r.description})`);
    });
  }

  if (errorTables.length > 0) {
    console.log(`\n⚠️  有問題的表格: ${errorTables.length}`);
    errorTables.forEach(r => {
      console.log(`   - ${r.name}: ${r.result.error}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('💡 建議：\n');

  if (missingTables.length > 0) {
    console.log('1. 建立缺失的表格：');
    console.log('   前往 Supabase Dashboard → SQL Editor');
    if (missingTables.some(r => r.name === 'schools')) {
      console.log('   - 執行 supabase/schema.sql 建立 schools 表');
    }
    if (missingTables.some(r => ['User', 'Account', 'Session', 'VerificationToken'].includes(r.name))) {
      console.log('   - 執行 supabase/auth-schema.sql 建立認證相關表格');
    }
    if (missingTables.some(r => r.name === 'user_qualifications')) {
      console.log('   - 執行 supabase/add-user-qualification-table.sql 建立 user_qualifications 表');
    }
    console.log('');
  }

  if (errorTables.some(r => r.result.error?.includes('權限'))) {
    console.log('2. 權限問題：');
    console.log('   請使用 SUPABASE_SERVICE_ROLE_KEY 而不是 NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.log('   可以在 Supabase Dashboard → Project Settings → API 中找到');
    console.log('');
  }

  if (existingTables.length === results.length) {
    console.log('🎉 所有表格都存在且連接正常！');
  }

  console.log('');
}

main().catch(error => {
  console.error('❌ 執行失敗:', error);
  process.exit(1);
});

