'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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

interface PostUpdateData {
  type: 'like' | 'unlike' | 'comment' | 'repost';
  likeCount?: number;
  commentCount?: number;
  repostCount?: number;
}

interface UsePostUpdatesOptions {
  postId: string;
  initialCounts: {
    likeCount: number;
    commentCount: number;
    repostCount: number;
  };
  /** 是否啟用即時訂閱。在 feed 列表中設為 false 可避免大量 Pusher 訂閱。預設 true。 */
  enabled?: boolean;
}

/**
 * Hook for subscribing to real-time post interaction updates
 */
export function usePostUpdates({ postId, initialCounts, enabled = true }: UsePostUpdatesOptions) {
  const [likeCount, setLikeCount] = useState(initialCounts.likeCount);
  const [commentCount, setCommentCount] = useState(initialCounts.commentCount);
  const [repostCount, setRepostCount] = useState(initialCounts.repostCount);
  const channelRef = useRef<ReturnType<PusherClient['subscribe']> | null>(null);

  // 提供手動更新計數的方法（用於本地狀態同步）
  const updateCounts = useCallback((updates: Partial<{ likeCount: number; commentCount: number; repostCount: number }>) => {
    if (updates.likeCount !== undefined) setLikeCount(updates.likeCount);
    if (updates.commentCount !== undefined) setCommentCount(updates.commentCount);
    if (updates.repostCount !== undefined) setRepostCount(updates.repostCount);
  }, []);

  useEffect(() => {
    if (!postId || !enabled) {
      return;
    }

    try {
      const pusher = getPusherClient();
      const channelName = `post-${postId}`;

      // 訂閱貼文頻道
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;

      // 監聽貼文更新事件
      channel.bind('post-update', (data: PostUpdateData) => {

        // 更新對應的計數
        switch (data.type) {
          case 'like':
          case 'unlike':
            if (data.likeCount !== undefined) {
              setLikeCount(data.likeCount);
            }
            break;
          case 'comment':
            if (data.commentCount !== undefined) {
              setCommentCount(data.commentCount);
            }
            break;
          case 'repost':
            if (data.repostCount !== undefined) {
              setRepostCount(data.repostCount);
            }
            break;
        }
      });


      return () => {
        // 清理：取消訂閱
        channel.unbind('post-update');
        pusher.unsubscribe(channelName);
        channelRef.current = null;
      };
    } catch (error) {
      console.error('[Pusher] Failed to subscribe to post updates:', error);
    }
  }, [postId, enabled]);

  return {
    likeCount,
    commentCount,
    repostCount,
    updateCounts,
  };
}





