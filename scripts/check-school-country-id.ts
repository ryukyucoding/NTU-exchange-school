/**
 * 檢查 schools 表的 country_id 數據
 * 
 * 使用方法：
 *   npx tsx scripts/check-school-country-id.ts
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
  process.exit(1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少 Supabase 環境變數！');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchoolCountryId() {
  console.log('🔍 檢查 schools 表的 country_id 數據...\n');

  try {
    // 1. 檢查 schools 表結構
    console.log('1. 檢查 schools 表結構...');
    const { data: sampleSchool, error: sampleError } = await supabase
      .from('schools')
      .select('*')
      .limit(1)
      .single();

    if (sampleError) {
      console.error('❌ 無法查詢 schools 表:', sampleError);
      return;
    }

    console.log('✅ 樣本學校數據:');
    console.log(JSON.stringify(sampleSchool, null, 2));
    console.log('');

    // 2. 統計有 country_id 的學校數量
    console.log('2. 統計有 country_id 的學校數量...');
    const { data: allSchools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name_zh, country_id');

    if (schoolsError) {
      console.error('❌ 無法查詢所有學校:', schoolsError);
      return;
    }

    const totalSchools = allSchools?.length || 0;
    const schoolsWithCountryId = allSchools?.filter(s => s.country_id != null).length || 0;
    const schoolsWithoutCountryId = totalSchools - schoolsWithCountryId;

    console.log(`   總學校數: ${totalSchools}`);
    console.log(`   有 country_id: ${schoolsWithCountryId}`);
    console.log(`   沒有 country_id: ${schoolsWithoutCountryId}`);
    console.log('');

    // 3. 檢查 Country 表
    console.log('3. 檢查 Country 表...');
    const { data: countries, error: countriesError } = await supabase
      .from('Country')
      .select('id, country_zh, country_en')
      .order('id')
      .limit(10);

    if (countriesError) {
      console.error('❌ 無法查詢 Country 表:', countriesError);
      return;
    }

    console.log(`   找到 ${countries?.length || 0} 個國家（前10個）:`);
    countries?.forEach((c: any) => {
      console.log(`   - ID: ${c.id} (${typeof c.id}), 中文: ${c.country_zh}, 英文: ${c.country_en}`);
    });
    console.log('');

    // 4. 檢查特定國家的學校
    if (countries && countries.length > 0) {
      const testCountryId = countries[0].id;
      console.log(`4. 檢查國家 ID ${testCountryId} 的學校...`);
      
      const { data: schoolsForCountry, error: filterError } = await supabase
        .from('schools')
        .select('id, name_zh, country_id')
        .eq('country_id', testCountryId)
        .limit(10);

      if (filterError) {
        console.error('❌ 無法查詢該國家的學校:', filterError);
      } else {
        console.log(`   找到 ${schoolsForCountry?.length || 0} 個學校（前10個）:`);
        schoolsForCountry?.forEach((s: any) => {
          console.log(`   - ID: ${s.id} (${typeof s.id}), country_id: ${s.country_id} (${typeof s.country_id}), 名稱: ${s.name_zh}`);
        });
      }
      console.log('');

      // 5. 檢查類型匹配
      console.log('5. 檢查類型匹配...');
      const countryIdStr = String(testCountryId);
      const matchingSchools = allSchools?.filter(s => {
        const schoolCountryIdStr = s.country_id != null ? String(s.country_id) : null;
        return schoolCountryIdStr === countryIdStr;
      }) || [];
      
      console.log(`   使用字符串比較 (${countryIdStr}):`);
      console.log(`   找到 ${matchingSchools.length} 個匹配的學校`);
      if (matchingSchools.length > 0) {
        matchingSchools.slice(0, 5).forEach((s: any) => {
          console.log(`   - ${s.name_zh} (country_id: ${s.country_id})`);
        });
      }
    }

    console.log('\n✅ 檢查完成！');
  } catch (error: any) {
    console.error('❌ 檢查失敗:', error);
    process.exit(1);
  }
}

checkSchoolCountryId();

