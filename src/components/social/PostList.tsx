'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import GeneralPostCard from './GeneralPostCard';
import SchoolReviewPostCard from './SchoolReviewPostCard';

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface Photo {
  id: string;
  url: string;
}

interface Ratings {
  schoolId: string;
  livingConvenience: number;
  costOfLiving: number;
  courseLoading: number;
}

interface School {
  id: string;
  name_zh: string;
  name_en: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: Author;
  createdAt: string;
  hashtags?: string[];
  photos?: Photo[];
  ratings?: Ratings;
  postType: 'general' | 'review';
  schools?: School[];
  likeCount: number;
  repostCount: number;
  commentCount: number;
  isLiked: boolean;
  isReposted: boolean;
}

interface PostListProps {
  filter: 'all' | 'following';
  boardId?: string | null;
  authorId?: string | null; // Filter posts by author
  sort?: 'latest' | 'popular';
  variant?: 'card' | 'plain';
  filterType?: 'rating' | null; // 'rating' to show only posts with SchoolRating
}

export default function PostList({
  filter,
  boardId,
  authorId,
  sort = 'latest',
  variant = 'card',
  filterType = null,
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
      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await fetch(`/api/posts?${params.toString()}`);
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
      console.error('Error fetching posts:', error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 切換 filter/boardId/authorId/sort/filterType 時重置列表
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, boardId, authorId, sort, filterType]);

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
      {posts.map((post) => {
        if (post.postType === 'review') {
          return <SchoolReviewPostCard key={post.id} post={post} />;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return <GeneralPostCard key={post.id} post={post as any} />;
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

