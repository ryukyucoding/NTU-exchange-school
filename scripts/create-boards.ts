/**
 * 批量創建 Board 記錄
 * 為所有國家和學校創建對應的看板
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// 手動載入 .env.local
const env: Record<string, string> = {};
try {
  const envFile = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8');
  envFile.split('\n').forEach((line) => {
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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 環境變數！');
  console.error('請設置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  console.error('💡 請確保 .env.local 文件存在並包含必要的環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createBoards() {
  console.log('🚀 開始創建 Board 記錄...\n');

  try {
    // 1. 獲取所有國家
    console.log('📋 獲取所有國家...');
    const { data: countries, error: countriesError } = await supabase
      .from('Country')
      .select('id, country_zh, country_en')
      .order('country_zh');

    if (countriesError) {
      console.error('❌ 獲取國家失敗:', countriesError);
      return;
    }

    console.log(`✅ 找到 ${countries?.length || 0} 個國家\n`);

    // 2. 獲取所有學校
    console.log('📋 獲取所有學校...');
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name_zh, name_en')
      .order('name_zh');

    if (schoolsError) {
      console.error('❌ 獲取學校失敗:', schoolsError);
      return;
    }

    console.log(`✅ 找到 ${schools?.length || 0} 間學校\n`);

    // 3. 檢查現有的 Board 記錄
    console.log('📋 檢查現有的 Board 記錄...');
    const { data: existingBoards, error: boardsError } = await supabase
      .from('Board')
      .select('id, type, country_id, schoolId');

    if (boardsError) {
      console.error('❌ 獲取現有 Board 失敗:', boardsError);
      return;
    }

    const existingCountryBoards = new Set(
      (existingBoards || [])
        .filter((b: any) => b.type === 'country' && b.country_id)
        .map((b: any) => b.country_id)
    );

    const existingSchoolBoards = new Set(
      (existingBoards || [])
        .filter((b: any) => b.type === 'school' && b.schoolId)
        .map((b: any) => b.schoolId)
    );

    console.log(`📊 現有國家板: ${existingCountryBoards.size}`);
    console.log(`📊 現有學校板: ${existingSchoolBoards.size}\n`);

    // 4. 創建國家板
    console.log('🏛️  創建國家板...');
    const countryBoardsToCreate = (countries || [])
      .filter((c: any) => !existingCountryBoards.has(c.id))
      .map((c: any) => ({
        id: randomUUID(),
        type: 'country',
        name: c.country_zh || c.country_en,
        slug: `country-${c.id}`,
        country_id: c.id,
        schoolId: null,
        description: null,
      }));

    let countryCreated = 0;
    let countrySkipped = 0;

    if (countryBoardsToCreate.length > 0) {
      // 批次插入（每次 100 筆）
      const batchSize = 100;
      for (let i = 0; i < countryBoardsToCreate.length; i += batchSize) {
        const batch = countryBoardsToCreate.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('Board')
          .insert(batch)
          .select('id');

        if (error) {
          console.error(`❌ 批次 ${i / batchSize + 1} 創建失敗:`, error);
        } else {
          countryCreated += data?.length || 0;
          console.log(`✅ 成功創建 ${data?.length || 0} 個國家板 (${i + 1}-${Math.min(i + batchSize, countryBoardsToCreate.length)})`);
        }
      }
    } else {
      countrySkipped = countries?.length || 0;
      console.log('⏭️  所有國家板已存在，跳過創建');
    }

    console.log(`\n📊 國家板統計: 創建 ${countryCreated} 個，跳過 ${countrySkipped} 個\n`);

    // 5. 創建學校板
    console.log('🏫 創建學校板...');
    const schoolBoardsToCreate = (schools || [])
      .filter((s: any) => !existingSchoolBoards.has(s.id))
      .map((s: any) => ({
        id: randomUUID(),
        type: 'school',
        name: s.name_zh || s.name_en,
        slug: `school-${s.id}`,
        country_id: null,
        schoolId: s.id,
        description: null,
      }));

    let schoolCreated = 0;
    let schoolSkipped = 0;

    if (schoolBoardsToCreate.length > 0) {
      // 批次插入（每次 100 筆）
      const batchSize = 100;
      for (let i = 0; i < schoolBoardsToCreate.length; i += batchSize) {
        const batch = schoolBoardsToCreate.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('Board')
          .insert(batch)
          .select('id');

        if (error) {
          console.error(`❌ 批次 ${i / batchSize + 1} 創建失敗:`, error);
        } else {
          schoolCreated += data?.length || 0;
          console.log(`✅ 成功創建 ${data?.length || 0} 個學校板 (${i + 1}-${Math.min(i + batchSize, schoolBoardsToCreate.length)})`);
        }
      }
    } else {
      schoolSkipped = schools?.length || 0;
      console.log('⏭️  所有學校板已存在，跳過創建');
    }

    console.log(`\n📊 學校板統計: 創建 ${schoolCreated} 個，跳過 ${schoolSkipped} 個\n`);

    // 6. 最終統計
    console.log('='.repeat(50));
    console.log('✅ Board 創建完成！');
    console.log(`   國家板: 創建 ${countryCreated} 個，跳過 ${countrySkipped} 個`);
    console.log(`   學校板: 創建 ${schoolCreated} 個，跳過 ${schoolSkipped} 個`);
    console.log(`   總計: ${countryCreated + schoolCreated} 個新 Board`);
    console.log('='.repeat(50));
  } catch (error: any) {
    console.error('❌ 發生錯誤:', error);
    process.exit(1);
  }
}

// 執行
createBoards()
  .then(() => {
    console.log('\n✨ 完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 執行失敗:', error);
    process.exit(1);
  });

