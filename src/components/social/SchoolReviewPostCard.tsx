'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Heart, MessageCircle, Repeat2, Bookmark, MoreHorizontal, Trash2, Star, DollarSign } from 'lucide-react';
import { cleanMarkdown, truncateLines } from '@/utils/markdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PostWithAuthor as Post } from '@/types/social';

interface SchoolReviewPostCardProps {
  post: Post;
}

export default function SchoolReviewPostCard({ post }: SchoolReviewPostCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [isReposted, setIsReposted] = useState(post.isReposted);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);

  const isAuthor = session?.user && (session.user as { id: string }).id === post.author.id;

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
      console.error('Error toggling like:', error instanceof Error ? error.message : String(error));
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
      console.error('Error toggling repost:', error instanceof Error ? error.message : String(error));
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
      console.error('Error toggling bookmark:', error instanceof Error ? error.message : String(error));
    }
  };

  const handleDelete = async () => {
    if (!confirm('確定要刪除這篇貼文嗎？')) return;
    
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        router.refresh();
      } else {
        alert(data.error || '刪除失敗');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('刪除失敗，請稍後再試');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_v, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-[#8D7051] text-[#8D7051]' : 'text-gray-300'}`}
      />
    ));
  };

  const renderDollarSigns = (rating: number) => {
    return Array.from({ length: 3 }, (_v, i) => (
      <button
        key={i}
        type="button"
        disabled
        className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
          i < rating
            ? 'bg-[#8D7051] text-white'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {'$'.repeat(i + 1)}
      </button>
    ));
  };

  // 清理並截斷內容 - 移除換行，單行顯示
  const cleanedContent = cleanMarkdown(post.content).replace(/\n/g, ' ').trim();
  // 限制字數而不是行數（大約150字，相當於3行）
  const truncatedContent = cleanedContent.length > 150 
    ? cleanedContent.substring(0, 150) + '...' 
    : cleanedContent;

  // 收集所有國家（優先使用API返回的countries，否則從學校中提取）
  const countries = post.countries && post.countries.length > 0
    ? post.countries
    : (post.schools 
        ? [...new Set(post.schools.map(s => s.country).filter(Boolean))]
        : []);

  return (
    <Card className="p-6 bg-white border-0 shadow-none">
      {/* 作者資訊行 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
          {post.author?.image && (
            <img
              src={post.author.image}
              alt={post.author.name || 'User'}
              className="w-full h-full rounded-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/social/profile/${post.author.id}`}>
              <span className="text-sm font-semibold hover:underline" style={{ color: '#5A5A5A' }}>
                {post.author.name || 'Unknown User'}
              </span>
            </Link>
            <span className="text-sm" style={{ color: '#5A5A5A' }}>·</span>
            <span className="text-sm" style={{ color: '#5A5A5A' }}>{formatDate(post.createdAt)}</span>
          </div>
        </div>
        {isAuthor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" style={{ color: '#5A5A5A' }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                刪除貼文
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 標題 */}
      <Link href={`/social/posts/${post.id}`}>
        <h3 className="text-2xl font-semibold mb-3 hover:underline" style={{ color: '#5A5A5A', letterSpacing: '0.05em' }}>
          {post.title}
        </h3>
      </Link>

      {/* 國家和學校標籤 */}
      <div className="flex flex-wrap gap-2 mb-3">
        {countries.map((country, index) => (
          <Link
            key={`country-${index}`}
            href={`/social/boards/country/by-name?name=${encodeURIComponent(country)}`}
            className="px-3 py-1.5 rounded-full text-sm transition-colors"
            style={{
              backgroundColor: 'rgba(186, 199, 229, 0.41)',
              border: '1px solid #BAC7E5',
              color: '#5A5A5A',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(186, 199, 229, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(186, 199, 229, 0.41)';
            }}
          >
            {country}
          </Link>
        ))}
        {post.schools && post.schools.map((school, index) => (
          <Link
            key={`school-${index}`}
            href={`/social/boards/school/${school.id}`}
            className="px-3 py-1.5 rounded-full text-sm transition-colors"
            style={{
              backgroundColor: 'rgba(186, 199, 229, 0.41)',
              border: '1px solid #BAC7E5',
              color: '#5A5A5A',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(186, 199, 229, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(186, 199, 229, 0.41)';
            }}
          >
            {school.name_zh || school.name_en}
          </Link>
        ))}
        {/* Hashtags */}
        {post.hashtags && post.hashtags.map((tag, index) => (
          <Link
            key={`tag-${index}`}
            href={`/social?hashtag=${encodeURIComponent(tag)}`}
            className="px-3 py-1.5 rounded-full text-sm transition-colors"
            style={{
              backgroundColor: 'rgba(141, 112, 81, 0.34)',
              border: '1px solid #8D7051',
              color: '#5A5A5A',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(141, 112, 81, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(141, 112, 81, 0.34)';
            }}
          >
            {tag}
          </Link>
        ))}
      </div>

      {/* 評分指標 */}
      {post.ratings && (
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium" style={{ color: '#5A5A5A' }}>
              生活機能
            </span>
            <div className="flex items-center gap-1">
              {renderStars(post.ratings.livingConvenience)}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium" style={{ color: '#5A5A5A' }}>
              學習體驗
            </span>
            <div className="flex items-center gap-1">
              {renderStars(post.ratings.courseLoading)}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium" style={{ color: '#5A5A5A' }}>
              物價水準
            </span>
            <div className="flex items-center gap-1">
              {renderDollarSigns(post.ratings.costOfLiving)}
            </div>
          </div>
        </div>
      )}

      {/* 文章內容 */}
      <Link href={`/social/posts/${post.id}`}>
        <p 
          className="text-sm mb-4"
          style={{ color: '#5A5A5A' }}
        >
          {truncatedContent}
        </p>
      </Link>

      {/* 互動按鈕 */}
      <div className="flex items-center gap-6 pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          className="flex items-center gap-2 hover:bg-transparent group"
          style={{ color: '#5A5A5A' }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-[#f5ede1] transition-colors">
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
          </div>
          <span className="text-base">{likeCount}</span>
        </Button>
        <Link href={`/social/posts/${post.id}`}>
          <Button 
            variant="ghost" 
            size="sm"
            className="flex items-center gap-2 hover:bg-transparent group"
            style={{ color: '#5A5A5A' }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-[#f5ede1] transition-colors">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="text-base">{post.commentCount}</span>
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRepost}
          className="flex items-center gap-2 hover:bg-transparent group"
          style={{ color: isReposted ? '#10b981' : '#5A5A5A' }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-[#f5ede1] transition-colors">
            <Repeat2 className={`h-5 w-5 ${isReposted ? 'fill-green-500 text-green-500' : ''}`} />
          </div>
          <span className="text-base">{post.repostCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBookmark}
          className="flex items-center gap-2 hover:bg-transparent group"
          style={{ color: isBookmarked ? '#f59e0b' : '#5A5A5A' }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-[#f5ede1] transition-colors">
            <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          </div>
        </Button>
      </div>
    </Card>
  );
}
