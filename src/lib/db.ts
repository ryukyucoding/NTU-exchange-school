/**
 * Supabase Server Client
 * 用於在伺服器端元件和 API 路由中使用
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * 不在模組頂層 throw：否則任何 import 此檔的 API 在缺 env 時會整包載入失敗，
 * Next 回傳 HTML 500，前端只能看到「HTTP error! status: 500」。
 */
export function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) {
    throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 環境變數！');
  }
  if (!supabaseServiceKey) {
    throw new Error('缺少 SUPABASE_SERVICE_ROLE_KEY 環境變數！');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
