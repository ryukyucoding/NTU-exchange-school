'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';

interface UsePostActionsParams {
  postId: string;
  initialIsLiked: boolean;
  initialIsReposted: boolean;
  initialIsBookmarked: boolean;
  onLikeCountUpdate?: (count: number) => void;
}

interface UsePostActionsReturn {
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
  handleLike: () => Promise<void>;
  handleRepost: () => void;
  handleBookmark: () => Promise<void>;
  isLoading: boolean;
}

export function usePostActions({
  postId,
  initialIsLiked,
  initialIsReposted,
  initialIsBookmarked,
  onLikeCountUpdate,
}: UsePostActionsParams): UsePostActionsReturn {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isReposted, setIsReposted] = useState(initialIsReposted);
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isLoading, setIsLoading] = useState(false);

  const handleLike = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/posts/${postId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setIsLiked(!isLiked);
        posthog.capture('post_liked', { post_id: postId, action: isLiked ? 'unlike' : 'like' });
        // 更新 like 計數（如果有提供回調）
        if (onLikeCountUpdate && typeof data.likeCount === 'number') {
          onLikeCountUpdate(data.likeCount);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLoading(false);
    }
  }, [postId, isLiked, onLikeCountUpdate]);

  const handleRepost = useCallback(() => {
    // 跳轉到發文頁面並帶上 repostId 參數，記錄當前頁面作為 return
    const currentUrl = window.location.pathname + window.location.search;
    router.push(`/social/post/general?repostId=${postId}&return=${encodeURIComponent(currentUrl)}`);
  }, [postId, router]);

  const handleBookmark = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/posts/${postId}/bookmark`, {
        method: isBookmarked ? 'DELETE' : 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setIsBookmarked(!isBookmarked);
        posthog.capture('post_bookmarked', { post_id: postId, action: isBookmarked ? 'remove' : 'add' });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setIsLoading(false);
    }
  }, [postId, isBookmarked]);

  return {
    isLiked,
    isReposted,
    isBookmarked,
    handleLike,
    handleRepost,
    handleBookmark,
    isLoading,
  };
}
