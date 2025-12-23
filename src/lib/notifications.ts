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

  console.log('[createBoardNewPostNotifications] 開始處理通知:', {
    postId,
    boardIds,
    authorId,
    boardCount: boardIds.length,
  });

  // 獲取所有追蹤這些看板的用戶（同時查詢 Board 資訊以便除錯）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: followers, error: followersError } = await (supabase as any)
    .from('BoardFollow')
    .select('userId, boardId, Board!inner(name, type)')
    .in('boardId', boardIds);

  console.log('[createBoardNewPostNotifications] 查詢追蹤者結果:', {
    followersCount: followers?.length || 0,
    boardIds: boardIds, // 顯示傳入的 boardIds 順序
    followers: followers?.map((f: any) => ({
      userId: f.userId,
      boardId: f.boardId,
      boardName: f.Board?.name,
      boardType: f.Board?.type
    })),
    error: followersError,
  });

  if (!followers || followers.length === 0) {
    console.log('[createBoardNewPostNotifications] 沒有追蹤者，跳過通知');
    return;
  }

  // 為每個追蹤者建立通知，並使用他們追蹤的看板 ID
  // 去重：如果同一個使用者追蹤了多個看板（例如同時追蹤國家板和學校板），
  // 只為該使用者建立一個通知，使用他追蹤的第一個看板 ID
  const userBoardMap = new Map<string, string>();
  followers.forEach((f: any) => {
    if (f.userId !== authorId && !userBoardMap.has(f.userId)) {
      userBoardMap.set(f.userId, f.boardId);
    }
  });

  console.log('[createBoardNewPostNotifications] 準備建立通知:', {
    totalFollowers: followers.length,
    uniqueUserIds: userBoardMap.size,
    authorId,
    willCreateNotifications: userBoardMap.size,
    userBoardMap: Array.from(userBoardMap.entries()), // 顯示所有映射關係
  });

  // 批量創建通知（最多1000個）
  const notifications = Array.from(userBoardMap.entries())
    .slice(0, 1000)
    .map(([userId, boardId]) => ({
      id: crypto.randomUUID(),
      userId,
      type: 'board_new_post',
      actorId: authorId,
      postId,
      boardId, // 使用該使用者追蹤的看板 ID
      read: false,
      createdAt: new Date().toISOString(),
    }));

  if (notifications.length > 0) {
    // 記錄即將建立的通知樣本（用於除錯）
    console.log('[createBoardNewPostNotifications] 即將建立的通知樣本（前3個）:', {
      samples: notifications.slice(0, 3).map(n => ({
        userId: n.userId,
        boardId: n.boardId,
        postId: n.postId,
      }))
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any).from('Notification').insert(notifications);

    if (insertError) {
      console.error('[createBoardNewPostNotifications] 建立通知失敗:', insertError);
    } else {
      console.log('[createBoardNewPostNotifications] 成功建立通知:', {
        count: notifications.length,
        boardIds,
      });

      // 驗證剛建立的通知（查詢幾個樣本並顯示 Board 資訊）
      const sampleNotificationIds = notifications.slice(0, 3).map(n => n.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: createdNotifications } = await (supabase as any)
        .from('Notification')
        .select('id, userId, boardId, Board!inner(name, type)')
        .in('id', sampleNotificationIds);

      console.log('[createBoardNewPostNotifications] 驗證剛建立的通知:', {
        samples: createdNotifications?.map((n: any) => ({
          userId: n.userId,
          boardId: n.boardId,
          boardName: n.Board?.name,
          boardType: n.Board?.type
        }))
      });
    }

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
    const pushResults = await Promise.allSettled(pushPromises);

    const successCount = pushResults.filter(r => r.status === 'fulfilled').length;
    const failCount = pushResults.filter(r => r.status === 'rejected').length;

    console.log('[createBoardNewPostNotifications] Pusher 推送結果:', {
      total: pushResults.length,
      success: successCount,
      failed: failCount,
    });
  }
}
