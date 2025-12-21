/**
 * 為 schools 表更新 country_id 數據
 * 
 * 注意：此腳本假設 country_id 欄位已經存在
 * 如果欄位不存在，請先在 Supabase SQL Editor 中執行：
 *   supabase/add-country-id-to-schools.sql
 * 
 * 使用方法：
 *   npx tsx scripts/add-country-id-to-schools.ts
 */

import { createClient } from '@supabase/supabase-js';
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateSchoolCountryIds() {
  console.log('🚀 開始更新學校的 country_id...\n');

  try {
    // 步驟 1: 檢查欄位是否存在
    console.log('📋 檢查 country_id 欄位...');
    const { data: sampleSchool, error: sampleError } = await supabase
      .from('schools')
      .select('id, country, country_en, country_id')
      .limit(1)
      .single();

    if (sampleError) {
      if (sampleError.code === '42703' || sampleError.message?.includes('country_id')) {
        console.error('❌ country_id 欄位不存在！');
        console.error('💡 請先在 Supabase SQL Editor 中執行: supabase/add-country-id-to-schools.sql');
        process.exit(1);
      }
      throw sampleError;
    }

    console.log('✅ country_id 欄位存在\n');

    // 步驟 2: 獲取所有國家
    console.log('📋 獲取所有國家...');
    const { data: countries, error: countriesError } = await supabase
      .from('Country')
      .select('id, country_zh, country_en');

    if (countriesError) {
      throw countriesError;
    }

    console.log(`✅ 找到 ${countries?.length || 0} 個國家\n`);

    // 步驟 3: 獲取所有學校
    console.log('📋 獲取所有學校...');
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, country, country_en, country_id');

    if (schoolsError) {
      throw schoolsError;
    }

    console.log(`✅ 找到 ${schools?.length || 0} 個學校\n`);

    // 步驟 4: 更新學校的 country_id
    console.log('🔄 開始更新學校的 country_id...\n');
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const school of schools || []) {
      // 如果已經有 country_id，跳過
      if ((school as any).country_id) {
        skipped++;
        continue;
      }

      // 根據 country_zh 匹配
      let matchedCountry = (countries || []).find(
        (c: any) => c.country_zh === school.country
      );

      // 如果沒有匹配，嘗試 country_en
      if (!matchedCountry) {
        matchedCountry = (countries || []).find(
          (c: any) => c.country_en === (school as any).country_en
        );
      }

      if (matchedCountry) {
        const { error: updateError } = await supabase
          .from('schools')
          .update({ country_id: matchedCountry.id })
          .eq('id', school.id);

        if (updateError) {
          console.error(`❌ 更新學校 ${school.id} (${school.country}) 失敗:`, updateError.message);
          failed++;
        } else {
          updated++;
          if (updated % 10 === 0) {
            console.log(`   已更新 ${updated} 個學校...`);
          }
        }
      } else {
        console.warn(`⚠️  無法找到國家匹配: ${school.country} / ${(school as any).country_en}`);
        failed++;
      }
    }

    console.log(`\n✅ 更新完成:`);
    console.log(`   - 成功更新: ${updated} 個學校`);
    console.log(`   - 已跳過（已有 country_id）: ${skipped} 個學校`);
    console.log(`   - 失敗/無法匹配: ${failed} 個學校`);
    console.log('\n✅ Migration 完成！');
  } catch (error: any) {
    console.error('❌ Migration 失敗:', error);
    process.exit(1);
  }
}

// 執行 migration
updateSchoolCountryIds();

