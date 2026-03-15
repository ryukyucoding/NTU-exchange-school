'use client';

import { useEffect, useRef } from 'react';
import GeneralPostCard from './GeneralPostCard';
import SchoolReviewPostCard from './SchoolReviewPostCard';
import { usePosts } from '@/hooks/usePosts';

interface PostListProps {
  filter: 'all' | 'following';
  boardId?: string | null;
  authorId?: string | null;
  sort?: 'latest' | 'popular';
  variant?: 'card' | 'plain';
  filterType?: 'rating' | null;
  hashtag?: string | null;
  q?: string | null; // 關鍵字搜尋（標題/內容）
  bookmarked?: boolean;
  liked?: boolean;
}

export default function PostList({
  filter,
  boardId,
  authorId,
  sort = 'latest',
  variant = 'card',
  filterType = null,
  hashtag = null,
  q = null,
  bookmarked = false,
  liked = false,
}: PostListProps) {
  const observerTarget = useRef<HTMLDivElement>(null);

  // 使用自定義 hook 來管理貼文資料
  const { posts, loading, hasMore, loadMore } = usePosts({
    filter,
    boardId,
    authorId,
    sort,
    filterType,
    hashtag,
    q,
    bookmarked,
    liked,
  });

  // 使用 Intersection Observer 來檢測是否滾動到底部
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      {
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
  }, [hasMore, loading, loadMore]);

  const containerClassName =
    variant === 'plain'
      ? 'space-y-4'
      : 'min-h-full space-y-4 rounded-lg bg-white p-4 max-md:mx-0 max-md:w-full max-md:space-y-0 max-md:rounded-none max-md:p-0 md:rounded-none md:bg-transparent md:p-0';

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    const isSearchEmpty = q != null && q.trim() !== '';
    return (
      <div
        className={
          variant === 'plain'
            ? 'p-8 text-center'
            : 'rounded-lg bg-white p-8 max-md:min-h-[40vh] max-md:rounded-none md:rounded-xl'
        }
      >
        {isSearchEmpty ? (
          <p className="text-muted-foreground">
            沒有找到與「{q.trim()}」相關的貼文
          </p>
        ) : (
          <p className="text-muted-foreground">尚無貼文</p>
        )}
      </div>
    );
  }
  
  return (
    <div className={containerClassName}>
      {posts.map((post, index) => {
        const isLast = index === posts.length - 1;
        let postCard;
        if (post.postType === 'review') {
          postCard = <SchoolReviewPostCard post={post as any} />;
        } else {
          postCard = <GeneralPostCard post={post as any} />;
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

