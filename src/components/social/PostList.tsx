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

