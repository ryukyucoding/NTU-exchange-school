import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * 簡易 IP-based rate limiter
 * 注意：此為 in-memory 實作，適用於單一 server 執行環境。
 * 若部署於 serverless（如 Vercel），不同 instance 間不共享狀態，
 * 但仍可擋住同一 instance 的高頻攻擊。
 *
 * @param req     Next.js request
 * @param limit   在時間窗口內允許的最大請求數
 * @param windowMs 時間窗口（毫秒），預設 60 秒
 */
export function rateLimit(req: NextRequest, limit: number, windowMs = 60_000): NextResponse | null {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const key = `${req.nextUrl.pathname}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count += 1;

  if (entry.count > limit) {
    return NextResponse.json(
      { error: '請求過於頻繁，請稍後再試' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
        },
      }
    );
  }

  return null;
}
