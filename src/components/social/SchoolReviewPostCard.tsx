'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Heart, MessageCircle, Repeat2, Bookmark, MoreHorizontal, Trash2, Star, DollarSign, Edit } from 'lucide-react';
import { cleanMarkdown } from '@/utils/markdown';
import DeletePostDialog from './DeletePostDialog';
import { usePostUpdates } from '@/hooks/usePostUpdates';
import { usePostActions } from '@/hooks/usePostActions';
import { formatDate } from '@/utils/date';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { PostWithAuthor as Post } from '@/types/social';

interface SchoolReviewPostCardProps {
  post: Post;
  enableRealtime?: boolean;
}

export default function SchoolReviewPostCard({ post, enableRealtime = true }: SchoolReviewPostCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 使用即時更新 hook（feed 列表中停用，僅在詳細頁啟用）
  const { likeCount, commentCount, repostCount, updateCounts } = usePostUpdates({
    postId: post.id,
    initialCounts: {
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      repostCount: post.repostCount,
    },
    enabled: enableRealtime,
  });

  // 使用自定義 hook 來管理貼文互動
  const { isLiked, isReposted, isBookmarked, handleLike, handleRepost, handleBookmark } = usePostActions({
    postId: post.id,
    initialIsLiked: post.isLiked,
    initialIsReposted: post.isReposted,
    initialIsBookmarked: post.isBookmarked || false,
    onLikeCountUpdate: (count) => updateCounts({ likeCount: count }),
  });

  const isAuthor = session?.user && (session.user as { id: string }).id === post.author.id;

  const handleEdit = () => {
    // 導航到編輯頁面（review 類型），並記錄當前頁面作為返回 URL
    const currentUrl = window.location.pathname + window.location.search;
    router.push(`/social/post/review?edit=${post.id}&return=${encodeURIComponent(currentUrl)}`);
  };

  const handleDelete = async () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setShowDeleteDialog(false);
        // 強制刷新頁面
        window.location.reload();
      } else {
        alert(data.error || '刪除失敗');
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('刪除失敗，請稍後再試');
      setIsDeleting(false);
    }
  };


  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_v, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? 'fill-[#8D7051] text-[#8D7051]' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const renderDollarSigns = (rating: number) => {
    // 改为和编辑时一样的样式：一个标签，里面显示对应数量的$符号
    if (rating <= 0) return null;
    return (
      <button
        type="button"
        disabled
        className="px-3 py-1 rounded text-sm font-semibold text-[#8D7051]"
        style={{
          backgroundColor: 'rgba(141, 112, 81, 0.2)',
          letterSpacing: '0.1em',
        }}
      >
        {'$'.repeat(rating)}
      </button>
    );
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
      <div className="flex items-center gap-3 mb-4" onClick={(e) => e.stopPropagation()}>
        <Link href={`/social/profile/${post.author.id}`} onClick={(e) => e.stopPropagation()}>
          <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
            {post.author?.image && (
              <img
                src={post.author.image}
                alt={post.author.name || 'User'}
                className="w-full h-full rounded-full object-cover"
              />
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link href={`/social/profile/${post.author.id}`} onClick={(e) => e.stopPropagation()}>
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
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                <MoreHorizontal className="h-4 w-4" style={{ color: '#5A5A5A' }} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-gray-200">
              <DropdownMenuItem
                onClick={handleEdit}
                className="text-[#5A5A5A] data-[highlighted]:bg-gray-100 data-[highlighted]:text-[#5A5A5A]"
              >
                <Edit className="h-4 w-4 mr-2" />
                編輯貼文
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600 data-[highlighted]:bg-gray-100 data-[highlighted]:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                刪除貼文
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* 可點擊的標題區域 */}
      <Link 
        href={`/social/posts/${post.id}`}
        className="block cursor-pointer"
        style={{ textDecoration: 'none' }}
      >
        <h3 className="text-2xl font-semibold mb-3" style={{ color: '#5A5A5A', letterSpacing: '0.05em' }}>
          {post.title}
        </h3>
      </Link>

      {/* 國家和學校標籤 */}
      <div className="flex flex-wrap gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
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
            onClick={(e) => e.stopPropagation()}
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
            onClick={(e) => e.stopPropagation()}
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
            onClick={(e) => e.stopPropagation()}
          >
            #{tag}
          </Link>
        ))}
      </div>

      {/* 評分指標 */}
      {post.ratings && (
        <div className="mb-4 flex items-center justify-between gap-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium" style={{ color: '#5A5A5A' }}>
              生活機能
            </span>
            {renderStars(post.ratings.livingConvenience)}
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium" style={{ color: '#5A5A5A' }}>
              學習體驗
            </span>
            {renderStars(post.ratings.courseLoading)}
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium" style={{ color: '#5A5A5A' }}>
              物價水準
            </span>
            {renderDollarSigns(post.ratings.costOfLiving)}
          </div>
        </div>
      )}

      {/* 可點擊的內文區域 */}
      <Link 
        href={`/social/posts/${post.id}`}
        className="block cursor-pointer mb-4"
        style={{ textDecoration: 'none' }}
      >
        <p 
          className="text-sm"
          style={{ color: '#5A5A5A' }}
        >
          {truncatedContent}
        </p>
      </Link>

      {/* 互動按鈕 */}
      <div className="flex items-center gap-6 pt-4" onClick={(e) => e.stopPropagation()}>
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
            <span className="text-base">{commentCount}</span>
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRepost}
          className="flex items-center gap-2 hover:bg-transparent group"
          style={{ color: isReposted ? '#8D7051' : '#5A5A5A' }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-[#f5ede1] transition-colors">
            <Repeat2 className={`h-5 w-5 ${isReposted ? 'fill-[#8D7051] text-[#8D7051]' : ''}`} />
          </div>
          <span className="text-base">{repostCount}</span>
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

      {/* Delete Post Confirmation Dialog */}
      <DeletePostDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </Card>
  );
}
