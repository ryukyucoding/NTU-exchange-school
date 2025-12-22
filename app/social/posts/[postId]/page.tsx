'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import RouteGuard from '@/components/auth/RouteGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SocialSidebar from '@/components/social/SocialSidebar';
import { Heart, MessageCircle, Repeat2, Bookmark, ArrowLeft, Star, DollarSign } from 'lucide-react';
import { markdownToHtml } from '@/lib/utils';
import CommentSection from '@/components/social/CommentSection';
import RepostPreview from '@/components/social/RepostPreview';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

function PostDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const postId = params.postId as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [repostCount, setRepostCount] = useState(0);

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
          setLikeCount(data.post.likeCount || 0);
          setRepostCount(data.post.repostCount || 0);
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
    <div className="min-h-screen bg-[#F4F4F4]">
      {/* Title Frame - 固定在 header 内部居中 */}
      <div 
        className="fixed top-0 left-0 right-0 z-[51] flex justify-center items-center"
        style={{ 
          height: '64px', // header 的高度
          pointerEvents: 'none' // 让点击事件穿透
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

      <div className="h-[calc(100vh-64px)] bg-[#F4F4F4] overflow-hidden flex flex-col pt-0">
        <div className="max-w-[1400px] mx-auto px-2 flex-1 overflow-hidden flex gap-6 items-start justify-center h-full">
            {/* Left Sidebar - Empty but keeps layout structure */}
            <aside className="hidden md:block w-64 flex-shrink-0">
              {/* Empty sidebar to maintain three-column layout */}
            </aside>

            {/* Main Content - Posts (ONLY scrollable area) */}
            <main className="w-[800px] flex-shrink-0 h-full overflow-y-auto overscroll-contain">
              <div className="space-y-4 bg-white p-4 rounded-lg">
                  {/* Back Button */}
                  <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="mb-4 flex items-center gap-2 hover:bg-gray-100"
                    style={{ color: '#5A5A5A' }}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    返回
                  </Button>

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
                        <span className="text-base">{post.commentCount}</span>
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
                        style={{ color: isBookmarked ? '#f59e0b' : '#5A5A5A' }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-[#f5ede1] transition-colors">
                          <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        </div>
                      </Button>
                    </div>
                  </Card>

                  {/* Divider */}
                  <div className="border-b border-gray-200" />

                  {/* Comment Section */}
                  <CommentSection postId={post.id} />
              </div>
            </main>

            {/* Right Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <SocialSidebar />
            </aside>
          </div>
        </div>
      </div>
  );
}

export default function PostDetailPage() {
  return (
    <RouteGuard>
      <PostDetailContent />
    </RouteGuard>
  );
}

