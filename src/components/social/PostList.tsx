'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import GeneralPostCard from './GeneralPostCard';
import SchoolReviewPostCard from './SchoolReviewPostCard';

interface Post {
  id: string;
  title: string;
  content: string;
  author: any;
  createdAt: string;
  hashtags?: string[];
  photos?: any[];
  ratings?: any;
  postType: 'general' | 'review';
  schools?: any[];
  likeCount: number;
  repostCount: number;
  commentCount: number;
  isLiked: boolean;
  isReposted: boolean;
}

interface PostListProps {
  filter: 'all' | 'following';
  boardId?: string | null;
  sort?: 'latest' | 'popular';
}

export default function PostList({ filter, boardId, sort = 'latest' }: PostListProps) {
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
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 切換 filter/boardId/sort 時重置列表
    setPosts([]);
    setNextCursor(null);
    setHasMore(true);
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, boardId, sort]);

  const loadMore = () => {
    if (nextCursor && !loading) {
      fetchPosts(nextCursor);
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="space-y-4 bg-white p-4 rounded-lg">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg">
        <div className="p-8 text-center">
          <p className="text-muted-foreground">尚無貼文</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg">
      {posts.map((post) => {
        if (post.postType === 'review') {
          return <SchoolReviewPostCard key={post.id} post={post} />;
        }
        return <GeneralPostCard key={post.id} post={post} />;
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

