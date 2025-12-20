/**
 * Supabase Client for Client Components
 * 用於在客戶端元件中使用
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 在開發環境中，如果沒有設定 Supabase，使用占位符以避免錯誤
// 但功能會受限（無法使用 Supabase 相關功能）
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  警告：未設定 Supabase 環境變數！某些功能可能無法使用。');
    console.warn('   請在 .env.local 中設定 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY');
  } else {
    throw new Error('缺少 Supabase 環境變數！請檢查 .env.local 檔案');
  }
}

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'ntu-exchange-school',
      },
    },
  }
);
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'ntu-exchange-school',
    },
  },
});
