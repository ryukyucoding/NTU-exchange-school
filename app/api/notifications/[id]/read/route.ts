import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登入' }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;
    const supabase = getSupabaseServer();

    // 驗證通知屬於當前用戶
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: notification } = await (supabase as any)
      .from('Notification')
      .select('userId')
      .eq('id', id)
      .single();

    if (!notification || notification.userId !== userId) {
      return NextResponse.json({ error: '無權限' }, { status: 403 });
    }

    // 更新為已讀
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('Notification')
      .update({ read: true })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: '標記已讀失敗' },
      { status: 500 }
    );
  }
}
