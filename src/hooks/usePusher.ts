'use client';

import { useEffect, useRef } from 'react';
import PusherClient from 'pusher-js';

// 客戶端 Pusher 實例（單例）
let pusherClient: PusherClient | null = null;

function getPusherClient(): PusherClient {
  if (!pusherClient) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap3';

    if (!key) {
      throw new Error('NEXT_PUBLIC_PUSHER_KEY is not configured');
    }

    pusherClient = new PusherClient(key, {
      cluster,
    });
  }

  return pusherClient;
}

interface UsePusherOptions {
  userId: string | null | undefined;
  onNewNotification?: (notification: unknown) => void;
}

/**
 * Hook for subscribing to Pusher notifications
 */
export function usePusher({ userId, onNewNotification }: UsePusherOptions) {
  const channelRef = useRef<ReturnType<PusherClient['subscribe']> | null>(null);

  useEffect(() => {
    if (!userId) {
      // 用戶未登入，不訂閱
      return;
    }

    try {
      const pusher = getPusherClient();
      const channelName = `user-${userId}`;

      // 訂閱用戶頻道
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;

      // 監聽新通知事件
      channel.bind('new-notification', (data: unknown) => {
        console.log('[Pusher] New notification received:', data);
        onNewNotification?.(data);
      });

      console.log(`[Pusher] Subscribed to ${channelName}`);

      return () => {
        // 清理：取消訂閱
        channel.unbind('new-notification');
        pusher.unsubscribe(channelName);
        channelRef.current = null;
        console.log(`[Pusher] Unsubscribed from ${channelName}`);
      };
    } catch (error) {
      console.error('[Pusher] Failed to subscribe:', error);
    }
  }, [userId, onNewNotification]);

  return null;
}
