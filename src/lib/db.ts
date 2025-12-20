/**
 * Supabase Server Client
 * 用於在伺服器端元件和 API 路由中使用
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 環境變數！');
}

// 如果沒有 service key，使用 anon key（僅用於開發）
const supabaseKey = supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 檢查 service key 是否為占位符
if (supabaseServiceKey && (supabaseServiceKey === 'your-service-role-key' || supabaseServiceKey.includes('your-'))) {
  console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY 似乎是占位符，請設置正確的 Service Role Key');
}

export function getSupabaseServer() {
  if (!supabaseKey) {
    throw new Error('缺少 Supabase 密鑰！請設置 SUPABASE_SERVICE_ROLE_KEY 或 NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
