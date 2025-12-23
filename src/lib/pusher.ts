import Pusher from 'pusher';

// 伺服器端 Pusher 實例（用於推送通知）
let pusherServer: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (!pusherServer) {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER || 'ap3';

    if (!appId || !key || !secret) {
      throw new Error('Pusher credentials are not configured in environment variables');
    }

    pusherServer = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }

  return pusherServer;
}

/**
 * 推送通知到用戶的頻道
 */
export async function pushNotificationToUser(userId: string, notification: unknown) {
  try {
    const pusher = getPusherServer();

    // 推送到用戶頻道: user-{userId}
    await pusher.trigger(`user-${userId}`, 'new-notification', notification);

    console.log(`[Pusher] Notification pushed to user ${userId}`);
  } catch (error) {
    console.error('[Pusher] Failed to push notification:', error);
    // 不要拋出錯誤，避免影響主要的通知創建流程
  }
}

/**
 * 推送貼文互動更新到公開頻道
 */
export async function pushPostUpdate(postId: string, updateData: {
  type: 'like' | 'unlike' | 'comment' | 'repost';
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
}) {
  try {
    const pusher = getPusherServer();

    // 推送到貼文頻道: post-{postId}
    await pusher.trigger(`post-${postId}`, 'post-update', updateData);

    console.log(`[Pusher] Post update pushed for post ${postId}:`, updateData.type);
  } catch (error) {
    console.error('[Pusher] Failed to push post update:', error);
  }
}
