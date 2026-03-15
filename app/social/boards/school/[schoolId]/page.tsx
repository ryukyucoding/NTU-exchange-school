'use client';

import { useEffect, useMemo, useState } from 'react';
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

  // Effect 1: 取得版面資訊，只依賴 schoolId，不依賴 session
  // 避免 NextAuth refetchOnWindowFocus 造成切換分頁/桌面時重新 loading
  useEffect(() => {
    let cancelled = false;
    const fetchBoard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/boards/school/${schoolId}`);
        const data: BoardInfoResponse = await res.json();
        if (!cancelled && data?.success) {
          setBoardId(data.board?.id || null);
          setStats(data.stats || { followerCount: 0, postCount: 0 });
          setAvgRatings(data.avgRatings || { livingConvenience: 0, costOfLiving: 0, courseLoading: 0 });
        }
      } catch (err) {
        console.error('Error fetching board info:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (schoolId) fetchBoard();
    return () => { cancelled = true; };
  }, [schoolId]);

  // Effect 2: 查詢追蹤狀態，boardId 有值後才跑，不觸發 loading spinner
  useEffect(() => {
    if (!boardId || !session?.user) return;
    let cancelled = false;
    const checkFollow = async () => {
      try {
        const followRes = await fetch(`/api/boards/${boardId}/follow`);
        const followData = await followRes.json();
        if (!cancelled && followData?.success) {
          setIsFollowing(followData.isFollowing || false);
        }
      } catch (err) {
        console.error('Error checking follow status:', err);
      }
    };
    checkFollow();
    return () => { cancelled = true; };
  }, [boardId]);

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
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-[#F4F4F4] max-md:bg-white md:bg-[#F4F4F4]">
      {boardTitle && (
        <div
          className="fixed left-0 right-0 z-[51] flex items-center justify-center border-b border-gray-100 bg-white md:top-0 md:h-16 md:border-b-0 md:bg-transparent max-md:top-16 max-md:h-12"
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="pointer-events-auto flex items-center justify-center whitespace-nowrap rounded-full border border-[#5A5A5A] bg-transparent px-4 py-1 max-md:bg-white"
            style={{ fontFamily: "'Noto Sans TC', sans-serif", color: '#5A5A5A', fontSize: 14 }}
          >
            <h1 className="text-sm font-semibold">{boardTitle}</h1>
          </div>
        </div>
      )}

      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 overflow-hidden bg-white px-0 pb-20 pt-14 max-md:pt-14 md:bg-[#F4F4F4] md:px-2 md:pb-6 md:pt-4 lg:pb-6">
        <div className="flex h-full min-h-0 w-full items-stretch justify-center gap-6">
          <aside className="hidden shrink-0 md:block md:w-16 lg:w-64" aria-hidden />

          <main className="flex h-full min-h-0 w-full min-w-0 max-w-[800px] flex-1 flex-col bg-white pr-px max-md:overflow-y-auto md:max-w-[800px] md:bg-[#F4F4F4] md:pr-0">
            <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[800px] max-md:min-h-full max-md:flex-1 flex-col max-md:overflow-y-auto md:h-full md:flex-1 md:overflow-hidden md:rounded-xl md:bg-white md:shadow-sm">
            <div className="min-h-[60vh] flex-1 overflow-y-auto overscroll-contain max-md:min-h-full md:min-h-0 max-md:p-4">
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
            {/* 電腦版給 Card 與背景條圓角 */}
            <Card className="mb-4 w-full max-w-[800px] overflow-hidden border-0 shadow-none max-md:rounded-none md:rounded-xl">
              <div className="h-32 max-md:rounded-none md:rounded-t-xl" style={{ backgroundColor: '#BAC7E5' }} />
              <div className="bg-white p-4 md:p-6">
                {/* 第一行：中文名 + 詳細；第二行：英文・國家；第三行：追蹤 + 貼文數/追蹤數（手機橫排） */}
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                  <div className="min-w-0 w-full flex-1 md:max-w-[540px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-bold text-gray-800 md:text-4xl">{boardTitle}</h2>
                      {school && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowSchoolDetail(true)}
                          className="h-9 w-9 shrink-0 bg-transparent text-[#6b5b4c] hover:bg-[#e8ddc8] hover:text-[#4a3828] hover:ring-1 hover:ring-[#d6c3a1] focus-visible:bg-[#e8ddc8] focus-visible:text-[#4a3828] focus-visible:ring-1 focus-visible:ring-[#d6c3a1]"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {school && (
                      <p className="mt-1 text-sm text-gray-500 md:mt-2">
                        {school.name_en}
                        {school.country && school.country_id && (
                          <>
                            {' ・ '}
                            <Link
                              href={`/social/boards/country/${school.country_id}`}
                              className="text-gray-500 transition-colors hover:text-gray-700 hover:underline"
                            >
                              {school.country}
                            </Link>
                          </>
                        )}
                        {school.country && !school.country_id && ` ・ ${school.country}`}
                      </p>
                    )}
                  </div>
                  <div className="flex w-full flex-row flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3 md:w-auto md:gap-6 md:border-t-0 md:pt-0">
                    {boardId && (
                      <Button
                        onClick={handleFollowToggle}
                        className="h-8 shrink-0 rounded-md px-3 py-0 text-xs font-medium transition-colors"
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
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-gray-600">
                      <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                        <span className="text-xs md:text-sm">貼文數</span>
                        <span className="text-base font-semibold md:text-xl">{stats.postCount}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                        <span className="text-xs md:text-sm">追蹤數</span>
                        <span className="text-base font-semibold md:text-xl">{stats.followerCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 評分：每列標題與星星同一行，手機直向堆疊 */}
                <div className="mb-4 mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
                  <div className="flex min-w-0 flex-row flex-nowrap items-center gap-2">
                    <span className="shrink-0 whitespace-nowrap text-sm font-medium" style={{ color: '#5A5A5A' }}>
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
                  <div className="flex min-w-0 flex-row flex-nowrap items-center gap-2">
                    <span className="shrink-0 whitespace-nowrap text-sm font-medium" style={{ color: '#5A5A5A' }}>
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
                  <div className="flex min-w-0 flex-row flex-nowrap items-center gap-2">
                    <span className="shrink-0 whitespace-nowrap text-sm font-medium" style={{ color: '#5A5A5A' }}>
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
                <div className="mt-6 flex gap-8 pl-4 md:gap-12 md:pl-10" style={{ fontFamily: "'Noto Sans TC', sans-serif" }}>
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
            </div>
          </main>

          {/* Right Sidebar (fixed, does NOT scroll) */}
          <aside className="hidden sm:block sm:w-56 md:w-60 lg:w-64 flex-shrink-0">
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


