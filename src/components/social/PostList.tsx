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
}

export default function PostList({
  filter,
  boardId,
  authorId,
  sort = 'latest',
  variant = 'card',
  filterType = null,
  hashtag = null,
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
      if (cursor) {
        params.append('cursor', cursor);
      }

      const url = `/api/posts?${params.toString()}`;
      console.log('[PostList] 開始獲取貼文:', {
        url,
        filter,
        boardId,
        sort,
        filterType,
        cursor: cursor || '無',
      });

      const response = await fetch(url);
      console.log('[PostList] API 回應狀態:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      const data = await response.json();
      console.log('[PostList] API 回應數據:', {
        success: data.success,
        postsCount: data.posts?.length || 0,
        nextCursor: data.nextCursor,
        error: data.error,
        samplePost: data.posts?.[0] ? {
          id: data.posts[0].id,
          title: data.posts[0].title,
          postType: data.posts[0].postType,
          author: data.posts[0].author ? {
            id: data.posts[0].author.id,
            name: data.posts[0].author.name,
          } : null,
        } : null,
      });

      if (data.success) {
        console.log('[PostList] 成功獲取貼文，準備更新狀態:', {
          postsCount: data.posts?.length || 0,
          isAppend: !!cursor,
          currentPostsCount: posts.length,
        });
        if (cursor) {
          setPosts((prev) => {
            const newPosts = [...prev, ...data.posts];
            console.log('[PostList] 追加貼文後總數:', newPosts.length);
            return newPosts;
          });
        } else {
          console.log('[PostList] 設置新貼文列表，數量:', data.posts?.length || 0);
          setPosts(data.posts);
        }
        setNextCursor(data.nextCursor);
        setHasMore(data.nextCursor !== null);
      } else {
        console.error('[PostList] API 返回失敗:', data.error);
      }
    } catch (error) {
      console.error('[PostList] 獲取貼文時發生錯誤:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      setLoading(false);
      console.log('[PostList] fetchPosts 完成，loading 設為 false');
    }
  };

  useEffect(() => {
    // 切換 filter/boardId/authorId/sort/filterType/hashtag 時重置列表
    console.log('[PostList] useEffect 觸發，重置並獲取貼文:', {
      filter,
      boardId,
      authorId,
      sort,
      filterType,
      hashtag,
    });
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, boardId, authorId, sort, filterType, hashtag]);

  const loadMore = () => {
    if (nextCursor && !loading) {
      fetchPosts(nextCursor);
    }
  };

  const containerClassName =
    variant === 'plain' ? 'space-y-4' : 'space-y-4 bg-white p-4 rounded-lg';

  console.log('[PostList] 渲染狀態:', {
    loading,
    postsCount: posts.length,
    nextCursor,
    hasMore,
  });

  if (loading && posts.length === 0) {
    console.log('[PostList] 顯示載入中...');
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    console.log('[PostList] 沒有貼文，顯示空狀態');
    return (
      <div className={variant === 'plain' ? 'p-8 text-center' : 'bg-white p-8 rounded-lg'}>
        <p className="text-muted-foreground">尚無貼文</p>
        <p className="text-xs text-gray-400 mt-2">Debug: loading={loading ? 'true' : 'false'}, posts.length={posts.length}</p>
      </div>
    );
  }

  console.log('[PostList] 準備渲染貼文列表，數量:', posts.length);
  
  return (
    <div className={containerClassName}>
      {posts.map((post, index) => {
        console.log(`[PostList] 渲染貼文 ${index + 1}/${posts.length}:`, {
          id: post.id,
          title: post.title,
          postType: post.postType,
          hasAuthor: !!post.author,
        });
        const isLast = index === posts.length - 1;
        const postCard = post.postType === 'review' 
          ? <SchoolReviewPostCard key={post.id} post={post} />
          : <GeneralPostCard key={post.id} post={post as any} />;
        
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

