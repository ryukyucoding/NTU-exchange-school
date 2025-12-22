'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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

  const loadMore = () => {
    if (nextCursor && !loading) {
      fetchPosts(nextCursor);
    }
  };

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
        <div className="flex justify-center pt-4">
          <Button onClick={loadMore} disabled={loading} variant="outline">
            {loading ? '載入中...' : '載入更多'}
          </Button>
        </div>
      )}
    </div>
  );
}

