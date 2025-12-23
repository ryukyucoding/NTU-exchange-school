import { getSupabaseServer } from './db';
import { pushNotificationToUser } from './pusher';

export type NotificationType =
  | 'post_like'
  | 'post_comment'
  | 'post_repost'
  | 'post_bookmark'
  | 'comment_like'
  | 'comment_reply'
  | 'board_new_post';

interface CreateNotificationParams {
  userId: string;        // 接收通知的用戶
  type: NotificationType;
  actorId?: string;      // 觸發動作的用戶
  postId?: string;
  commentId?: string;
  boardId?: string;
}

/**
 * 創建單條通知
 * 注意：不給自己發送通知
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, actorId, postId, commentId, boardId } = params;

  // 不給自己發送通知
  if (actorId && actorId === userId) {
    return null;
  }

  const supabase = getSupabaseServer();

  // 檢查是否有重複通知（5分鐘內相同類型、相同 actor、相同資源）
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingNotification } = await (supabase as any)
    .from('Notification')
    .select('id')
    .eq('userId', userId)
    .eq('type', type)
    .eq('actorId', actorId || null)
    .eq('postId', postId || null)
    .eq('commentId', commentId || null)
    .gte('createdAt', fiveMinutesAgo)
    .maybeSingle();

  if (existingNotification) {
    return null; // 已有相似通知，不重複創建
  }

  // 創建通知
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('Notification')
    .insert({
      id: crypto.randomUUID(),
      userId,
      type,
      actorId: actorId || null,
      postId: postId || null,
      commentId: commentId || null,
      boardId: boardId || null,
      read: false,
      createdAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    return null;
  }

  // 推送即時通知到 Pusher
  if (data) {
    await pushNotificationToUser(userId, {
      id: data.id,
      type: data.type,
      read: data.read,
      createdAt: data.createdAt,
    });
  }

  return data;
}

/**
 * 為追蹤板的用戶創建新貼文通知
 */
export async function createBoardNewPostNotifications(
  postId: string,
  boardIds: string[],
  authorId: string
) {
  if (boardIds.length === 0) return;

  const supabase = getSupabaseServer();

  // 獲取所有追蹤這些看板的用戶
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: followers } = await (supabase as any)
    .from('BoardFollow')
    .select('userId')
    .in('boardId', boardIds);

  if (!followers || followers.length === 0) return;

  // 去重並排除作者自己
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueUserIds = [...new Set(followers.map((f: any) => f.userId))]
    .filter(uid => uid !== authorId);

  // 批量創建通知（最多1000個）
  const notifications = uniqueUserIds.slice(0, 1000).map(userId => ({
    id: crypto.randomUUID(),
    userId,
    type: 'board_new_post',
    actorId: authorId,
    postId,
    boardId: boardIds[0], // 使用第一個 boardId
    read: false,
    createdAt: new Date().toISOString(),
  }));

  if (notifications.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('Notification').insert(notifications);

    // 推送即時通知到所有追蹤者（批量推送）
    // 注意：大量推送時可能需要考慮限流
    const pushPromises = notifications.map(notification =>
      pushNotificationToUser(notification.userId as string, {
        id: notification.id,
        type: notification.type,
        read: notification.read,
        createdAt: notification.createdAt,
      })
    );
    await Promise.allSettled(pushPromises);
  }
}
