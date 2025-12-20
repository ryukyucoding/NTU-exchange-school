'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Heart, MessageCircle, Repeat2, Bookmark, MoreHorizontal, Star } from 'lucide-react';

interface Post {
  id: string;
  title: string;
  content: string;
  author: any;
  createdAt: string;
  hashtags?: string[];
  photos?: any[];
  ratings?: {
    schoolId: string;
    livingConvenience: number;
    costOfLiving: number;
    courseLoading: number;
  };
  schools?: any[];
  likeCount: number;
  repostCount: number;
  commentCount: number;
  isLiked: boolean;
  isReposted: boolean;
}

interface SchoolReviewPostCardProps {
  post: Post;
}

export default function SchoolReviewPostCard({ post }: SchoolReviewPostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [isReposted, setIsReposted] = useState(post.isReposted);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setIsLiked(!isLiked);
        setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRepost = async () => {
    try {
      const response = await fetch(`/api/posts/${post.id}/repost`, {
        method: isReposted ? 'DELETE' : 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setIsReposted(!isReposted);
      }
    } catch (error) {
      console.error('Error toggling repost:', error);
    }
  };

  const handleBookmark = async () => {
    try {
      const response = await fetch(`/api/posts/${post.id}/bookmark`, {
        method: isBookmarked ? 'DELETE' : 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setIsBookmarked(!isBookmarked);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    if (hours < 24) return `${hours} 小時前`;
    if (days < 7) return `${days} 天前`;
    return date.toLocaleDateString('zh-TW');
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const renderCostRating = (rating: number) => {
    return '$'.repeat(rating);
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow bg-white border-0 shadow-sm">
      {/* Author Info */}
      <div className="flex items-center gap-3 mb-3">
        {post.author?.image && (
          <img
            src={post.author.image}
            alt={post.author.name || 'User'}
            className="w-10 h-10 rounded-full"
          />
        )}
        <div className="flex-1">
          <Link href={`/social/profile/${post.author.id}`}>
            <p className="font-semibold hover:underline">
              {post.author.name || 'Unknown User'}
            </p>
          </Link>
          <p className="text-sm text-muted-foreground">
            {formatDate(post.createdAt)}
          </p>
        </div>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Title */}
      <Link href={`/social/posts/${post.id}`}>
        <h3 className="text-lg font-semibold mb-2 hover:underline">
          {post.title}
        </h3>
      </Link>

      {/* Ratings */}
      {post.ratings && (
        <div className="bg-white p-3 rounded-lg mb-3 border border-gray-100">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">生活機能</p>
              <div className="flex items-center gap-1">
                {renderStars(post.ratings.livingConvenience)}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">學習體驗</p>
              <div className="flex items-center gap-1">
                {renderStars(post.ratings.courseLoading)}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">生活開銷</p>
              <div className="flex items-center gap-1">
                {['$', '$$', '$$$'].map((symbol, index) => (
                  <span
                    key={index}
                    className={`text-sm px-2 py-0.5 rounded ${
                      index + 1 === post.ratings?.costOfLiving
                        ? 'bg-[#BAC7E569] text-[#8D7051]'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {symbol}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Preview */}
      <Link href={`/social/posts/${post.id}`}>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
          {post.content}
        </p>
      </Link>

      {/* Tags/Badges - Schools and Hashtags */}
      {(post.schools && post.schools.length > 0) || (post.hashtags && post.hashtags.length > 0) ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {post.schools && post.schools.map((school, index) => (
            <Link
              key={`school-${index}`}
              href={`/social/boards/school/${school.id}`}
              className="text-sm px-3 py-1 rounded-full bg-[#BAC7E569] text-[#8D7051] hover:bg-[#BAC7E569]/80"
            >
              {school.name_zh || school.name_en}
            </Link>
          ))}
          {post.hashtags && post.hashtags.map((tag, index) => (
            <Link
              key={`tag-${index}`}
              href={`/social/hashtags/${encodeURIComponent(tag)}`}
              className="text-sm px-3 py-1 rounded-full bg-[#BAC7E569] text-[#8D7051] hover:bg-[#BAC7E569]/80"
            >
              {tag}
            </Link>
          ))}
        </div>
      ) : null}

      {/* Interaction Buttons */}
      <div className="flex items-center gap-4 pt-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className={isLiked ? 'text-red-500' : ''}
        >
          <Heart className={`h-4 w-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
          {likeCount}
        </Button>
        <Link href={`/social/posts/${post.id}`}>
          <Button variant="ghost" size="sm">
            <MessageCircle className="h-4 w-4 mr-2" />
            {post.commentCount}
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRepost}
          className={isReposted ? 'text-green-500' : ''}
        >
          <Repeat2 className="h-4 w-4 mr-2" />
          {post.repostCount}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBookmark}
          className={isBookmarked ? 'text-yellow-500' : ''}
        >
          <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
        </Button>
      </div>
    </Card>
  );
}

