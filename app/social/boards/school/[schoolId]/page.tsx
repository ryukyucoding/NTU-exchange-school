'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import RouteGuard from '@/components/auth/RouteGuard';
import SocialSidebar from '@/components/social/SocialSidebar';
import SocialBottomNav from '@/components/social/SocialBottomNav';
import PostList from '@/components/social/PostList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { Star, Info } from 'lucide-react';
import SchoolDetailModal from '@/components/school-display/SchoolDetailModal';

type SortMode = 'popular' | 'latest' | 'rating';

interface BoardInfoResponse {
  success: boolean;
  board: { id: string | null; name: string; schoolId?: string | null } | null;
  stats: { followerCount: number; postCount: number };
  avgRatings?: {
    livingConvenience: number;
    costOfLiving: number;
    courseLoading: number;
  };
}

function SchoolBoardContent() {
  const params = useParams<{ schoolId: string }>();
  const schoolId = params?.schoolId || '';

  const { data: session } = useSession();
  const { schools, loading: schoolsLoading } = useSchoolContext();
  const school = useMemo(() => {
    if (!schools || schools.length === 0 || !schoolId) {
      return null;
    }

    // 使用字符串比较，避免类型不匹配
    const found = (schools || []).find((s) => {
      const schoolIdStr = s.id?.toString() || '';
      const targetIdStr = schoolId.toString();
      return schoolIdStr === targetIdStr;
    });

    return found;
  }, [schools, schoolId]);
  const boardTitle = school ? `${school.name_zh}板` : null;

  const [boardId, setBoardId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ followerCount: number; postCount: number }>({
    followerCount: 0,
    postCount: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);
  const [avgRatings, setAvgRatings] = useState<{
    livingConvenience: number;
    costOfLiving: number;
    courseLoading: number;
  }>({
    livingConvenience: 0,
    costOfLiving: 0,
    courseLoading: 0,
  });
  const [sort, setSort] = useState<SortMode>('popular');
  const [loading, setLoading] = useState(true);
  const [showSchoolDetail, setShowSchoolDetail] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchBoard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/boards/school/${schoolId}`);
        const data: BoardInfoResponse = await res.json();
        if (!cancelled && data?.success) {
          const bid = data.board?.id || null;
          setBoardId(bid);
          setStats(data.stats || { followerCount: 0, postCount: 0 });
          setAvgRatings(data.avgRatings || { livingConvenience: 0, costOfLiving: 0, courseLoading: 0 });
          
          // 檢查是否已追蹤
          if (bid && session?.user) {
            const followRes = await fetch(`/api/boards/${bid}/follow`);
            const followData = await followRes.json();
            if (!cancelled && followData?.success) {
              setIsFollowing(followData.isFollowing || false);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching board info:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (schoolId) fetchBoard();
    return () => {
      cancelled = true;
    };
  }, [schoolId, session]);

  // 设置主内容区的最小宽度
  useEffect(() => {
    const updateMinWidth = () => {
      if (mainContentRef.current) {
        if (window.innerWidth >= 1024) {
          mainContentRef.current.style.minWidth = '500px';
        } else {
          mainContentRef.current.style.minWidth = '800px';
        }
      }
    };
    
    // 使用 requestAnimationFrame 确保在 DOM 渲染后执行
    const rafId = requestAnimationFrame(() => {
      updateMinWidth();
      // 如果第一次执行时 ref 还没有设置，再试一次
      if (!mainContentRef.current) {
        setTimeout(updateMinWidth, 0);
      }
    });
    
    window.addEventListener('resize', updateMinWidth);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateMinWidth);
    };
  }, []);

  const handleFollowToggle = async () => {
    if (!boardId || !session?.user) return;
    
    try {
      if (isFollowing) {
        const res = await fetch(`/api/boards/${boardId}/follow`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          setIsFollowing(false);
          setStats(prev => ({ ...prev, followerCount: Math.max(0, prev.followerCount - 1) }));
          // 觸發側邊欄刷新
          window.dispatchEvent(new CustomEvent('boardFollowChanged'));
        }
      } else {
        const res = await fetch(`/api/boards/${boardId}/follow`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setIsFollowing(true);
          setStats(prev => ({ ...prev, followerCount: prev.followerCount + 1 }));
          // 觸發側邊欄刷新
          window.dispatchEvent(new CustomEvent('boardFollowChanged'));
        }
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  return (
    // AppShell 在 /social/boards/school/[id] 會加 pt-16，所以這裡用 (100vh - 64px) 鎖住整頁高度，避免 body 滾動
    <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col" style={{ backgroundColor: 'rgba(244, 244, 244, 1)' }}>
      {/* Topic Frame - 固定在 header 内部居中 */}
      {boardTitle && (
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
              paddingTop: '4px',
              paddingBottom: '4px',
              border: '1px solid #5A5A5A',
              borderRadius: '24px',
              boxSizing: 'border-box',
              backgroundColor: 'transparent',
            }}
          >
            <h1
              className="text-sm font-semibold whitespace-nowrap"
              style={{
                color: '#5A5A5A',
                fontSize: '14px',
                lineHeight: '20px',
                fontFamily: "'Noto Sans TC', sans-serif",
              }}
            >
              {boardTitle}
            </h1>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-2 pb-20 pt-4 flex-1 overflow-hidden lg:pb-6">
        <div className="flex gap-6 items-start justify-center h-full">
          <aside className="hidden md:block md:w-16 lg:w-64 flex-shrink-0" />

          {/* Main (ONLY scrollable area), can shrink to keep right sidebar visible */}
          <main ref={mainContentRef} style={{ flex: '0 1 800px', flexBasis: '800px', minWidth: '800px', maxWidth: '800px' }} className="h-full overflow-y-auto overscroll-contain">
            <div className="w-full min-w-full">
            {schoolsLoading || !school || loading ? (
              <Card className="border-0 shadow-none overflow-hidden mb-4">
                <div className="bg-white p-6">
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
                  </div>
                </div>
              </Card>
            ) : (
              <>
            <Card className="border-0 shadow-none overflow-hidden mb-4">
              <div className="h-32" style={{ backgroundColor: '#BAC7E5' }} />
              <div className="bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 max-w-[540px]">
                    <div className="flex items-center gap-2">
                      <h2 className="text-4xl font-bold text-gray-800">{boardTitle}</h2>
                      {school && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowSchoolDetail(true)}
                          className="h-9 w-9 bg-transparent text-[#6b5b4c] hover:bg-[#e8ddc8] hover:text-[#4a3828] hover:ring-1 hover:ring-[#d6c3a1] focus-visible:bg-[#e8ddc8] focus-visible:text-[#4a3828] focus-visible:ring-1 focus-visible:ring-[#d6c3a1]"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {school && (
                      <p className="text-gray-500 mt-2">
                        {school.name_en}
                        {school.country && school.country_id && (
                          <>
                            {' ・ '}
                            <Link
                              href={`/social/boards/country/${school.country_id}`}
                              className="hover:underline text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              {school.country}
                            </Link>
                          </>
                        )}
                        {school.country && !school.country_id && ` ・ ${school.country}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0">
                    {boardId && (
                      <Button
                        onClick={handleFollowToggle}
                        className="px-4 py-2 text-sm font-medium rounded-md transition-colors"
                        style={{
                          backgroundColor: isFollowing ? 'rgba(141, 112, 81, 0.2)' : '#8D7051',
                          color: isFollowing ? '#8D7051' : 'white',
                          border: 'none',
                          opacity: session?.user ? 1 : 0.6,
                        }}
                        disabled={!session?.user}
                      >
                        {isFollowing ? '追蹤中' : '追蹤'}
                      </Button>
                    )}
                    <div className="flex gap-10 text-gray-600">
                      <div className="text-right" style={{ minWidth: '80px' }}>
                        <div className="text-sm whitespace-nowrap">貼文數</div>
                        <div className="text-xl font-semibold">{stats.postCount}</div>
                      </div>
                      <div className="text-right" style={{ minWidth: '80px' }}>
                        <div className="text-sm whitespace-nowrap">追蹤數</div>
                        <div className="text-xl font-semibold">{stats.followerCount}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rating display - 和贴文一样的排版 */}
                <div className="mb-4 mt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium" style={{ color: '#5A5A5A' }}>
                      生活機能
                    </span>
                    {avgRatings.livingConvenience > 0 ? (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_v, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < Math.round(avgRatings.livingConvenience) ? 'fill-[#8D7051] text-[#8D7051]' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium" style={{ color: '#5A5A5A' }}>
                      學習體驗
                    </span>
                    {avgRatings.courseLoading > 0 ? (
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }, (_v, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < Math.round(avgRatings.courseLoading) ? 'fill-[#8D7051] text-[#8D7051]' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium" style={{ color: '#5A5A5A' }}>
                      物價水準
                    </span>
                    {avgRatings.costOfLiving > 0 ? (
                      <button
                        type="button"
                        disabled
                        className="px-3 py-1 rounded text-sm font-semibold text-[#8D7051]"
                        style={{
                          backgroundColor: 'rgba(141, 112, 81, 0.2)',
                          letterSpacing: '0.1em',
                        }}
                      >
                        {'$'.repeat(Math.round(avgRatings.costOfLiving))}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </div>
                </div>

                {/* Sort tabs (text only) */}
                <div className="mt-6 flex gap-12" style={{ fontFamily: "'Noto Sans TC', sans-serif", paddingLeft: '40px' }}>
                  <button
                    onClick={() => setSort('popular')}
                    className="text-sm font-semibold"
                    style={{ color: sort === 'popular' ? '#5A5A5A' : '#A6A6A6' }}
                  >
                    熱門
                  </button>
                  <button
                    onClick={() => setSort('latest')}
                    className="text-sm font-semibold"
                    style={{ color: sort === 'latest' ? '#5A5A5A' : '#A6A6A6' }}
                  >
                    最新
                  </button>
                  <button
                    onClick={() => setSort('rating')}
                    className="text-sm font-semibold"
                    style={{ color: sort === 'rating' ? '#5A5A5A' : '#A6A6A6' }}
                  >
                    評分
                  </button>
                </div>
                <div className="mt-3 border-b" style={{ borderColor: '#D9D9D9', width: '100%' }} />

                {/* Posts (continuous with the same white block) */}
                <div className="mt-6">
                  {loading && !boardId ? (
                    <div className="p-8 text-center">
                      <p className="text-muted-foreground">載入中...</p>
                    </div>
                  ) : (
                    <PostList
                      filter="all"
                      boardId={boardId}
                      sort={sort === 'popular' ? 'popular' : 'latest'}
                      filterType={sort === 'rating' ? 'rating' : null}
                      variant="plain"
                    />
                  )}
                </div>
              </div>
            </Card>
            </>
            )}
            </div>
          </main>

          {/* Right Sidebar (fixed, does NOT scroll) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <SocialSidebar />
          </aside>
        </div>
      </div>

      {/* Bottom Navigation - Only visible on screens smaller than lg */}
      <SocialBottomNav />

      {/* School Detail Modal */}
      {school && (
        <SchoolDetailModal
          school={school}
          open={showSchoolDetail}
          onClose={() => setShowSchoolDetail(false)}
          variant="wishlist"
          showDiscussButton={false}
        />
      )}
    </div>
  );
}

export default function SchoolBoardPage() {
  return (
    <RouteGuard>
      <SchoolBoardContent />
    </RouteGuard>
  );
}


