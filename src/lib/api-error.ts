import { NextResponse } from 'next/server';

/**
 * 統一的 API 錯誤回應
 * 只在 server console 記錄詳細錯誤，不對外暴露 DB 內部資訊
 */
export function serverError(logMessage: string, error: unknown, status = 500) {
  console.error(logMessage, error);
  return NextResponse.json(
    { error: '伺服器錯誤，請稍後再試' },
    { status }
  );
}
