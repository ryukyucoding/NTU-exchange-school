'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Heart, MessageCircle, Repeat2, Bookmark, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { cleanMarkdown, truncateLines } from '@/utils/markdown';
import { markdownToHtml } from '@/lib/utils';
import RepostPreview from './RepostPreview';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Board {
  id: string;
  name: string;
  type: 'country' | 'school';
  country_id: number | null;
  schoolId: number | null;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string | null;
    userID: string;
    image?: string | null;
  };
  createdAt: string;
  hashtags?: string[];
  photos?: { url: string; alt?: string }[];
  schools?: { id: string; name_zh: string; name_en: string; country: string }[];
  countries?: string[]; // 國家列表
  boards?: Board[]; // 新增：boards 陣列
  likeCount: number;
  repostCount: number;
  commentCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked?: boolean;
  repostId?: string; // 轉發的原貼文 ID
  originalPost?: { // 原貼文數據
    id: string;
    title: string;
    content: string;
    author: {
      id: string;
      name: string | null;
      userID: string;
      image?: string | null;
    };
    createdAt: string;
    schools?: { id: string; name_zh: string; name_en: string; country: string }[];
    countries?: string[];
    hashtags?: string[];
    boards?: Board[]; // 新增：原貼文的 boards
  };
}

interface GeneralPostCardProps {
  post: Post;
}

export default function GeneralPostCard({ post }: GeneralPostCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [isReposted, setIsReposted] = useState(post.isReposted);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked || false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

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
      console.error('Error toggling like:', error);
    }
  };

  const handleRepost = () => {
    // 跳轉到發文頁面並帶上 repostId 參數
    router.push(`/social/post/general?repostId=${post.id}`);
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

  const handleEdit = () => {
    // 導航到編輯頁面（general 類型），並記錄當前頁面作為返回 URL
    const currentUrl = window.location.pathname + window.location.search;
    router.push(`/social/post/general?edit=${post.id}&return=${encodeURIComponent(currentUrl)}`);
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
                {post.author.name || post.author.userID || 'Unknown User'}
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
      {!post.repostId ? (
        <Link 
          href={`/social/posts/${post.id}`}
          className="block cursor-pointer mb-4"
          style={{ textDecoration: 'none' }}
        >
          <h3 className="text-2xl font-semibold mb-3" style={{ color: '#5A5A5A', letterSpacing: '0.05em' }}>
            {post.title}
          </h3>
          <p 
            className="text-sm"
            style={{ color: '#5A5A5A' }}
          >
            {truncatedContent}
          </p>
        </Link>
      ) : (
        <Link 
          href={`/social/posts/${post.id}`}
          className="block cursor-pointer"
          style={{ textDecoration: 'none' }}
        >
          <h3 className="text-2xl font-semibold mb-3" style={{ color: '#5A5A5A', letterSpacing: '0.05em' }}>
            {post.title}
          </h3>
        </Link>
      )}

      {/* 國家和學校標籤 */}
      <div className="flex flex-wrap gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
        {/* 優先使用 boards 陣列生成連結（正確的連結格式） */}
        {post.boards && post.boards.length > 0 ? (
          <>
            {post.boards
              .filter((board) => board.type === 'country' && board.country_id !== null)
              .map((board, index) => (
                <Link
                  key={`board-country-${board.id}-${index}`}
                  href={`/social/boards/country/${board.country_id}`}
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
                  {board.name}
                </Link>
              ))}
            {post.boards
              .filter((board) => board.type === 'school' && board.schoolId !== null)
              .map((board, index) => (
                <Link
                  key={`board-school-${board.id}-${index}`}
                  href={`/social/boards/school/${board.schoolId}`}
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
                  {board.name}
                </Link>
              ))}
          </>
        ) : (
          <>
            {/* Fallback：如果沒有 boards，使用舊的 countries/schools 陣列 */}
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
          </>
        )}
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
            {tag}
          </Link>
        ))}
      </div>

      {/* 文章內容 - 如果有輸入內容，顯示在預覽框上方 */}
      {post.content.trim() && post.repostId && post.originalPost && (
        <Link 
          href={`/social/posts/${post.id}`}
          className="block cursor-pointer mb-4"
          style={{ textDecoration: 'none' }}
        >
          <div 
            className="text-sm prose prose-sm max-w-none"
            style={{ color: '#5A5A5A' }}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }}
          />
        </Link>
      )}
      
      {/* 轉發預覽框 */}
      {post.repostId && post.originalPost && (
        <div className="mb-4" onClick={(e) => e.stopPropagation()}>
          <RepostPreview originalPost={post.originalPost} />
        </div>
      )}
      

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
            <span className="text-base">{post.commentCount}</span>
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
          <span className="text-base">{post.repostCount}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBookmark}
          className="flex items-center gap-2 hover:bg-transparent group"
          style={{ color: isBookmarked ? '#8D7051' : '#5A5A5A' }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-[#f5ede1] transition-colors">
            <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-[#8D7051] text-[#8D7051]' : ''}`} />
          </div>
        </Button>
      </div>
    </Card>
  );
}
