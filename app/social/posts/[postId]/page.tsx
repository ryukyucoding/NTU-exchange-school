'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import RouteGuard from '@/components/auth/RouteGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SocialSidebar from '@/components/social/SocialSidebar';
import { Heart, MessageCircle, Repeat2, Bookmark, ArrowLeft, Star, DollarSign, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { markdownToHtml } from '@/lib/utils';
import CommentSection from '@/components/social/CommentSection';
import RepostPreview from '@/components/social/RepostPreview';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Author {
  id: string;
  name: string | null;
  userID: string;
  image?: string | null;
}

interface Photo {
  id: string;
  url: string;
  alt?: string;
}

interface School {
  id: string;
  name_zh: string;
  name_en: string;
  country: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: Author;
  createdAt: string;
  hashtags?: string[];
  photos?: Photo[];
  ratings?: {
    schoolId: string;
    livingConvenience: number;
    costOfLiving: number;
    courseLoading: number;
  };
  schools?: School[];
  countries?: string[];
  likeCount: number;
  repostCount: number;
  commentCount: number;
  isLiked: boolean;
  isReposted: boolean;
  repostId?: string;
  originalPost?: {
    id: string;
    title: string;
    content: string;
    author: Author;
    createdAt: string;
    schools?: School[];
    countries?: string[];
    hashtags?: string[];
  };
}

function PostDetailContentInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const postId = params.postId as string;
  const returnUrl = searchParams.get('return');

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [repostCount, setRepostCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        // 使用单个帖子ID查询
        const response = await fetch(`/api/posts/${postId}`);
        const data = await response.json();
        
        if (data.success && data.post) {
          setPost(data.post);
          setIsLiked(data.post.isLiked || false);
          setIsReposted(data.post.isReposted || false);
          setIsBookmarked(data.post.isBookmarked || false);
          setLikeCount(data.post.likeCount || 0);
          setRepostCount(data.post.repostCount || 0);
          setCommentCount(data.post.commentCount || 0);
        } else {
          toast.error('貼文不存在');
          router.push('/social');
        }
      } catch (error) {
        console.error('Error fetching post:', error);
        toast.error('載入失敗');
        router.push('/social');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId, router]);

  const handleLike = async () => {
    if (!post) return;
    
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
    if (!post) return;
    
    try {
      const response = await fetch(`/api/posts/${post.id}/repost`, {
        method: isReposted ? 'DELETE' : 'POST',
      });
      const data = await response.json();
      if (data.success) {
        setIsReposted(!isReposted);
        setRepostCount(isReposted ? repostCount - 1 : repostCount + 1);
      }
    } catch (error) {
      console.error('Error toggling repost:', error);
    }
  };

  const handleBookmark = async () => {
    if (!post) return;
    
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

  const handleCommentAdded = async () => {
    // 刷新贴文数据以获取最新的评论数
    try {
      const response = await fetch(`/api/posts/${postId}`);
      const data = await response.json();
      if (data.success && data.post) {
        setCommentCount(data.post.commentCount || 0);
      }
    } catch (error) {
      console.error('Error refreshing comment count:', error);
    }
  };

  const isAuthor = session?.user && post && (session.user as { id: string }).id === post.author.id;

  const handleEdit = () => {
    if (!post) return;
    // 根據貼文類型導航到對應的編輯頁面，並記錄當前頁面作為返回 URL
    const postType = post.ratings ? 'review' : 'general';
    const currentUrl = window.location.pathname + window.location.search;
    router.push(`/social/post/${postType}?edit=${post.id}&return=${encodeURIComponent(currentUrl)}`);
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm('確定要刪除這篇貼文嗎？')) return;
    
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('貼文已刪除');
        router.push('/social');
      } else {
        toast.error(data.error || '刪除失敗');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('刪除失敗，請稍後再試');
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
    const dollarSign = '$';
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
        {dollarSign.repeat(i + 1)}
      </button>
    ));
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-64px)] bg-[#F4F4F4] flex items-center justify-center">
        <div className="text-gray-500">載入中...</div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  const countries = post.countries && post.countries.length > 0
    ? post.countries
    : (post.schools 
        ? [...new Set(post.schools.map(s => s.country).filter(Boolean))]
        : []);

  const htmlContent = markdownToHtml(post.content);

  const proseStyles = `
    .prose img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 1rem 0;
      border-radius: 8px;
    }
    .prose a {
      color: #3b82f6;
      text-decoration: underline;
    }
    .prose a:hover {
      color: #2563eb;
    }
    .prose strong {
      font-weight: 600;
      color: #5A5A5A;
    }
    .prose h1 {
      font-size: 1.875rem;
      font-weight: 600;
      margin-top: 1.5rem;
      margin-bottom: 1rem;
      color: #5A5A5A;
    }
    .prose h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-top: 1.25rem;
      margin-bottom: 0.75rem;
      color: #5A5A5A;
    }
    .prose h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-top: 1rem;
      margin-bottom: 0.5rem;
      color: #5A5A5A;
    }
    .prose big {
      font-size: 1.25em;
    }
    .prose small {
      font-size: 0.875em;
    }
  `;

  return (
    // AppShell 在 /social 會加 pt-16，所以這裡用 (100vh - 64px) 鎖住整頁高度，避免 body 滾動
    <div className="h-[calc(100vh-64px)] bg-[#F4F4F4] overflow-hidden flex flex-col">
      {/* Title Frame - 固定在 header 内部居中 */}
      <div
        className="fixed top-0 left-0 right-0 z-[51] flex justify-center items-center"
        style={{
          height: '64px', // header 的高度
          pointerEvents: 'none', // 让点击事件穿透
        }}
      >
        <div
          className="flex items-center justify-center pointer-events-auto"
          style={{
            width: 'auto',
            minWidth: '140px',
            paddingLeft: '16px',
            paddingRight: '16px',
            height: '32px',
            border: '1px solid #5A5A5A',
            borderRadius: '24px',
            boxSizing: 'border-box',
            backgroundColor: 'transparent',
          }}
        >
          <h1
            className="text-sm font-semibold"
            style={{
              color: '#5A5A5A',
              fontSize: '14px',
              lineHeight: '20px',
              fontFamily: "'Noto Sans TC', sans-serif",
            }}
          >
            {post.title}
          </h1>
        </div>
      </div>

      {/* Content Frame: Main content area with post detail and sidebar */}
      <div className="max-w-[1400px] mx-auto px-2 pb-6 pt-4 flex-1 overflow-hidden">
        <div className="flex gap-6 items-start justify-center h-full">
          {/* Left Sidebar - Empty but keeps layout structure */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            {/* Empty sidebar to maintain three-column layout */}
          </aside>

          {/* Main Content - Posts (ONLY scrollable area) */}
            <main className="w-[800px] flex-shrink-0 h-full overflow-y-auto overscroll-contain">
              <div className="space-y-4 bg-white p-4 rounded-lg">
                  {/* Back Button and Edit/Delete Menu */}
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        if (returnUrl) {
                          router.push(returnUrl);
                        } else {
                          router.back();
                        }
                      }}
                      className="flex items-center gap-2 hover:bg-gray-100"
                      style={{ color: '#5A5A5A' }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      返回
                    </Button>
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

                  {/* Post Card */}
                  <Card className="rounded-xl text-card-foreground p-6 bg-white border-0 shadow-none">
                    {/* Author Info */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex-shrink-0">
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
                              {post.author.name || post.author.userID || 'Unknown User'}
                            </span>
                          </Link>
                          <span className="text-sm" style={{ color: '#5A5A5A' }}>·</span>
                          <span className="text-sm" style={{ color: '#5A5A5A' }}>{formatDate(post.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-semibold mb-6" style={{ color: '#5A5A5A', letterSpacing: '0.05em' }}>
                      {post.title}
                    </h1>

                    {/* Country, School, Hashtags */}
                    <div className="flex flex-wrap gap-2 mb-6">
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

                    {/* Ratings (if review post) */}
                    {post.ratings && (
                      <div className="mb-6 flex items-center justify-between gap-4 pb-6" style={{ borderBottom: '1px solid #D9D9D9' }}>
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

                    {/* 轉發預覽框 - 顯示在內容之前 */}
                    {post.repostId && post.originalPost && (
                      <div className="mb-6">
                        <RepostPreview originalPost={post.originalPost} />
                      </div>
                    )}

                    {/* Content */}
                    <div 
                      className="mb-4 prose prose-sm max-w-none" 
                      style={{ 
                        color: '#5A5A5A',
                        lineHeight: '1.75',
                      }}
                      dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                    <style
                      dangerouslySetInnerHTML={{
                        __html: proseStyles,
                      }}
                    />

                    {/* Interaction Buttons */}
                    <div className="flex items-center gap-6 pt-2">
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
                        style={{ color: isBookmarked ? '#8D7051' : '#5A5A5A' }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-[#f5ede1] transition-colors">
                          <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-[#8D7051] text-[#8D7051]' : ''}`} />
                        </div>
                      </Button>
                    </div>
                  </Card>

                  {/* Divider */}
                  <div className="border-b border-gray-200" />

                  {/* Comment Section */}
                  <CommentSection postId={post.id} onCommentAdded={handleCommentAdded} />
              </div>
            </main>

          {/* Right Sidebar - Fixed (does NOT scroll) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <SocialSidebar />
          </aside>
        </div>
      </div>
    </div>
  );
}

function PostDetailContent() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">載入中...</div>}>
      <PostDetailContentInner />
    </Suspense>
  );
}

export default function PostDetailPage() {
  return (
    <RouteGuard>
      <PostDetailContent />
    </RouteGuard>
  );
}

