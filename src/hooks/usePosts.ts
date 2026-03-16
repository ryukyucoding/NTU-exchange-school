'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PostWithAuthor as Post } from '@/types/social';

interface UsePostsParams {
  filter: 'all' | 'following';
  boardId?: string | null;
  authorId?: string | null;
  sort?: 'latest' | 'popular';
  filterType?: 'rating' | null;
  hashtag?: string | null;
  q?: string | null; // 關鍵字搜尋（標題/內容）
  bookmarked?: boolean;
  liked?: boolean;
}

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  refetch: () => void;
}

export function usePosts({
  filter,
  boardId,
  authorId,
  sort = 'latest',
  filterType = null,
  hashtag = null,
  q = null,
  bookmarked = false,
  liked = false,
}: UsePostsParams): UsePostsReturn {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPosts = useCallback(async (cursor?: string) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        filter,
        limit: '20',
        sort,
      });

      if (boardId) params.append('boardId', boardId);
      if (authorId) params.append('authorId', authorId);
      if (filterType) params.append('filterType', filterType);
      if (hashtag) params.append('hashtag', hashtag);
      if (q) params.append('q', q);
      if (bookmarked) params.append('bookmarked', 'true');
      if (liked) params.append('liked', 'true');
      if (cursor) params.append('cursor', cursor);

      const url = `/api/posts?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        if (cursor) {
          setPosts((prev) => [...prev, ...data.posts]);
        } else {
          setPosts(data.posts);
        }
        setNextCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
      }
    } catch (err) {
      console.error('[usePosts] 獲取貼文時發生錯誤:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch posts'));
    } finally {
      setLoading(false);
    }
  }, [filter, boardId, authorId, sort, filterType, hashtag, q, bookmarked, liked]);

  // 切換 filter 參數時重置列表
  useEffect(() => {
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    fetchPosts();
  }, [fetchPosts]);

  const loadMore = useCallback(() => {
    if (nextCursor && !loading && hasMore) {
      fetchPosts(nextCursor);
    }
  }, [nextCursor, loading, hasMore, fetchPosts]);

  const refetch = useCallback(() => {
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    hasMore,
    error,
    loadMore,
    refetch,
  };
}
