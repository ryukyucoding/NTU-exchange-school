'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import GeneralPostCard from './GeneralPostCard';
import SchoolReviewPostCard from './SchoolReviewPostCard';
import type { PostWithAuthor as Post } from '@/types/social';

interface PostListProps {
  filter: 'all' | 'following';
  boardId?: string | null;
  authorId?: string | null; // Filter posts by author
  sort?: 'latest' | 'popular';
  variant?: 'card' | 'plain';
  filterType?: 'rating' | null; // 'rating' to show only posts with SchoolRating
  hashtag?: string | null; // Filter posts by hashtag
  bookmarked?: boolean; // Filter posts by bookmarked
  liked?: boolean; // Filter posts by liked
}

export default function PostList({
  filter,
  boardId,
  authorId,
  sort = 'latest',
  variant = 'card',
  filterType = null,
  hashtag = null,
  bookmarked = false,
  liked = false,
}: PostListProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchPosts = async (cursor?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        filter,
        limit: '20',
        sort,
      });
      if (boardId) {
        params.append('boardId', boardId);
      }
      if (authorId) {
        params.append('authorId', authorId);
      }
      if (filterType) {
        params.append('filterType', filterType);
      }
      if (hashtag) {
        params.append('hashtag', hashtag);
      }
      if (bookmarked) {
        params.append('bookmarked', 'true');
      }
      if (liked) {
        params.append('liked', 'true');
      }
      if (cursor) {
        params.append('cursor', cursor);
      }

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
    } catch (error) {
      console.error('[PostList] 獲取貼文時發生錯誤:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 切換 filter/boardId/authorId/sort/filterType/hashtag/bookmarked/liked 時重置列表
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, boardId, authorId, sort, filterType, hashtag, bookmarked, liked]);

  const loadMore = useCallback(() => {
    if (nextCursor && !loading && hasMore) {
      fetchPosts(nextCursor);
    }
  }, [nextCursor, loading, hasMore]);

  // 使用 Intersection Observer 來檢測是否滾動到底部
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // 當觀察的元素進入視口時（即滾動到底部）
        if (entries[0].isIntersecting && hasMore && !loading && nextCursor) {
          loadMore();
        }
      },
      {
        // 當元素距離視口底部 100px 時就觸發
        rootMargin: '100px',
      }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, nextCursor, loadMore]);

  const containerClassName =
    variant === 'plain' ? 'space-y-4' : 'space-y-4 bg-white p-4 rounded-lg';

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className={variant === 'plain' ? 'p-8 text-center' : 'bg-white p-8 rounded-lg'}>
        <p className="text-muted-foreground">尚無貼文</p>
      </div>
    );
  }
  
  return (
    <div className={containerClassName}>
      {posts.map((post, index) => {
        const isLast = index === posts.length - 1;
        let postCard;
        if (post.postType === 'review') {
          postCard = <SchoolReviewPostCard key={post.id} post={post as any} />;
        } else {
          postCard = <GeneralPostCard key={post.id} post={post as any} />;
        }

        return (
          <div key={post.id}>
            {postCard}
            {!isLast && <div className="border-b border-gray-200 my-0" />}
          </div>
        );
      })}
      {hasMore && sort === 'latest' && (
        <div ref={observerTarget} className="flex justify-center pt-4">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
              <span className="ml-2 text-sm text-gray-500">載入中...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

