#!/usr/bin/env tsx
/**
 * 搜尋特定的 Post 記錄
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function searchPost() {
  // 搜尋包含 "董同學" 或 "九州" 的 Post
  const { data: data1, error: error1 } = await supabase
    .from('Post')
    .select('id, title, content, status')
    .ilike('content', '%董同學%')
    .limit(5);

  if (error1) {
    console.error('❌ 查詢錯誤 (董同學):', error1.message);
  } else {
    console.log(`\n🔍 包含 "董同學" 的 Post: ${data1?.length || 0} 筆`);
    data1?.forEach((post) => {
      console.log(`- ID: ${post.id}, Title: ${post.title}, Status: ${post.status}`);
      console.log(`  內容預覽: ${post.content.substring(0, 100)}...`);
    });
  }

  const { data: data2, error: error2 } = await supabase
    .from('Post')
    .select('id, title, content, status')
    .ilike('content', '%九州%')
    .limit(5);

  if (error2) {
    console.error('❌ 查詢錯誤 (九州):', error2.message);
  } else {
    console.log(`\n🔍 包含 "九州" 的 Post: ${data2?.length || 0} 筆`);
    data2?.forEach((post) => {
      console.log(`- ID: ${post.id}, Title: ${post.title}, Status: ${post.status}`);
      console.log(`  內容預覽: ${post.content.substring(0, 100)}...`);
    });
  }

  // 搜尋包含 "董同學 九州" 的 Post
  const { data: data3, error: error3 } = await supabase
    .from('Post')
    .select('id, title, content, status')
    .ilike('content', '%董同學%九州%')
    .eq('status', 'published')
    .limit(5);

  if (error3) {
    console.error('❌ 查詢錯誤 (董同學 九州):', error3.message);
  } else {
    console.log(`\n🔍 包含 "董同學" 和 "九州" 且已發布的 Post: ${data3?.length || 0} 筆`);
    data3?.forEach((post) => {
      console.log(`- ID: ${post.id}, Title: ${post.title}, Status: ${post.status}`);
      console.log(`  內容預覽: ${post.content.substring(0, 100)}...`);
    });
  }

  // 檢查 type = 'experience' 的 Post
  const { data: data4, error: error4, count } = await supabase
    .from('Post')
    .select('id, title, type, status', { count: 'exact' })
    .eq('type', 'experience')
    .limit(10);

  if (error4) {
    console.error('❌ 查詢錯誤 (type=experience):', error4.message);
  } else {
    console.log(`\n📊 type='experience' 的 Post: ${count || 0} 筆`);
    data4?.forEach((post) => {
      console.log(`- ID: ${post.id}, Title: ${post.title}, Status: ${post.status}`);
    });
  }
}

searchPost().catch(console.error);
