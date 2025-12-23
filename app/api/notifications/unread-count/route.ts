import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登入' }, { status: 401 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseServer();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('Notification')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .eq('read', false);

    return NextResponse.json({
      success: true,
      count: count || 0,
      hasUnread: (count || 0) > 0,
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return NextResponse.json(
      { error: '獲取未讀數量失敗' },
      { status: 500 }
    );
  }
}
