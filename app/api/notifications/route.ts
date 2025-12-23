import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登入' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const supabase = getSupabaseServer();

    // 查詢通知（按創建時間倒序）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: notifications, error } = await (supabase as any)
      .from('Notification')
      .select(`
        id,
        type,
        read,
        createdAt,
        actorId,
        postId,
        commentId,
        boardId
      `)
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // 批量獲取相關數據
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actorIds = [...new Set(notifications.map((n: any) => n.actorId).filter(Boolean))];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postIds = [...new Set(notifications.map((n: any) => n.postId).filter(Boolean))];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commentIds = [...new Set(notifications.map((n: any) => n.commentId).filter(Boolean))];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const boardIds = [...new Set(notifications.map((n: any) => n.boardId).filter(Boolean))];

    // 獲取用戶信息
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: actors } = await (supabase as any)
      .from('User')
      .select('id, name, image, userID')
      .in('id', actorIds);

    // 獲取貼文信息
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: posts } = await (supabase as any)
      .from('Post')
      .select('id, content')
      .in('id', postIds);

    // 獲取留言信息
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: comments } = await (supabase as any)
      .from('Comment')
      .select('id, content, postId')
      .in('id', commentIds);

    // 獲取看板信息
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: boards } = await (supabase as any)
      .from('Board')
      .select('id, name')
      .in('id', boardIds);

    // 組合數據
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actorMap = new Map(actors?.map((a: any) => [a.id, a]) || []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postMap = new Map(posts?.map((p: any) => [p.id, p]) || []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commentMap = new Map(comments?.map((c: any) => [c.id, c]) || []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const boardMap = new Map(boards?.map((b: any) => [b.id, b]) || []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrichedNotifications = notifications.map((n: any) => ({
      ...n,
      actor: n.actorId ? actorMap.get(n.actorId) : null,
      post: n.postId ? postMap.get(n.postId) : null,
      comment: n.commentId ? commentMap.get(n.commentId) : null,
      board: n.boardId ? boardMap.get(n.boardId) : null,
    }));

    return NextResponse.json({
      success: true,
      notifications: enrichedNotifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: '獲取通知失敗' },
      { status: 500 }
    );
  }
}
