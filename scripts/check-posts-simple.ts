#!/usr/bin/env tsx
/**
 * 簡單檢查 Post 表中的記錄
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkPosts() {
  console.log('檢查 Post 表...');

  const { data, error, count } = await supabase
    .from('Post')
    .select('id, title, type, status, createdAt', { count: 'exact' })
    .neq('status', 'deleted');

  if (error) {
    console.error('❌ 查詢錯誤:', error.message);
    return;
  }

  console.log(`📊 Post 表總共有 ${count} 筆記錄`);

  if (data && data.length > 0) {
    console.log('\n前 10 筆記錄:');
    data.slice(0, 10).forEach((post, i) => {
      console.log(`${i + 1}. ${post.title} (${post.type}, ${post.status}) - ${post.createdAt}`);
    });
  }
}

checkPosts().catch(console.error);
