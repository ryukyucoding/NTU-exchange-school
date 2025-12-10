import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ 錯誤：請設定 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
  console.log('🔍 測試 Supabase 連線...\n');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Anon Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...\n`);

  try {
    // 測試 1: 取得資料表筆數
    console.log('📊 測試 1: 查詢資料表筆數...');
    const { count, error: countError } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ 查詢失敗:', countError);
      return;
    }

    console.log(`✅ 成功！資料庫中有 ${count} 筆學校資料\n`);

    // 測試 2: 取得前 5 筆資料
    console.log('📋 測試 2: 查詢前 5 筆資料...');
    const { data, error: fetchError } = await supabase
      .from('schools')
      .select('id, name_zh, name_en, country')
      .limit(5);

    if (fetchError) {
      console.error('❌ 查詢失敗:', fetchError);
      return;
    }

    console.log('✅ 成功！前 5 筆資料：');
    data?.forEach((school, index) => {
      console.log(`   ${index + 1}. ${school.name_zh} (${school.name_en}) - ${school.country}`);
    });
    console.log();

    // 測試 3: 測試搜尋功能
    console.log('🔎 測試 3: 測試搜尋功能（搜尋關鍵字: "日本"）...');
    const { data: searchData, error: searchError } = await supabase
      .from('schools')
      .select('id, name_zh, name_en, country')
      .or('name_zh.ilike.%日本%,country.ilike.%日本%')
      .limit(5);

    if (searchError) {
      console.error('❌ 搜尋失敗:', searchError);
      return;
    }

    console.log(`✅ 成功！找到 ${searchData?.length || 0} 筆相關資料：`);
    searchData?.forEach((school, index) => {
      console.log(`   ${index + 1}. ${school.name_zh} (${school.name_en})`);
    });
    console.log();

    // 測試 4: 測試地理位置查詢
    console.log('🗺️  測試 4: 測試地理位置查詢（有座標的學校）...');
    const { count: geoCount, error: geoError } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true })
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (geoError) {
      console.error('❌ 查詢失敗:', geoError);
      return;
    }

    console.log(`✅ 成功！有 ${geoCount} 筆學校有地理座標\n`);

    // 總結
    console.log('='.repeat(50));
    console.log('🎉 所有測試通過！Supabase 連線正常');
    console.log('='.repeat(50));
    console.log('\n你現在可以：');
    console.log('1. 執行 npm run import-data 匯入完整資料');
    console.log('2. 切換前端使用 Supabase 版本的 SchoolContext');
    console.log('3. 啟動開發伺服器：npm run dev\n');

  } catch (error) {
    console.error('❌ 測試過程發生錯誤:', error);
    process.exit(1);
  }
}

testConnection();
