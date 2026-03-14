'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import RouteGuard from '@/components/auth/RouteGuard';
import SocialSidebar from '@/components/social/SocialSidebar';
import SocialBottomNav from '@/components/social/SocialBottomNav';
import PostList from '@/components/social/PostList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { getCountryISO } from '@/utils/countryFlags';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

type SortMode = 'popular' | 'latest';

interface BoardInfoResponse {
  success: boolean;
  board: { id: string | null; name: string; country_id?: string | null } | null;
  stats: { followerCount: number; postCount: number };
  country?: { id: string; country_zh: string; country_en: string; continent: string } | null;
}

function CountryBoardContent() {
  const params = useParams<{ countryId: string }>();
  const countryId = params?.countryId || '';

  const { schools, loading: schoolsLoading } = useSchoolContext();

  const { data: session } = useSession();
  const [boardId, setBoardId] = useState<string | null>(null);
  const [countryInfo, setCountryInfo] = useState<{ country_zh: string; country_en: string } | null>(null);
  const [stats, setStats] = useState<{ followerCount: number; postCount: number }>({
    followerCount: 0,
    postCount: 0,
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [sort, setSort] = useState<SortMode>('popular');
  const [loading, setLoading] = useState(true);
  const [schoolRatings, setSchoolRatings] = useState<Record<string, { avgRating: number | null; count: number }>>({});

  const boardTitle = countryInfo ? `${countryInfo.country_zh}板` : null;
  const countryName = countryInfo?.country_zh || '';

  const countryISO = useMemo(() => getCountryISO(countryName), [countryName]);

  const boardSchools = useMemo(() => {
    if (!schools || schools.length === 0 || !countryId) {
      console.log('[CountryBoard] 過濾條件不滿足:', {
        schoolsCount: schools?.length || 0,
        countryId,
        schoolsLoading,
      });
      return [];
    }

    // 使用 country_id 來過濾學校
    // countryId 來自 URL 參數（字符串），需要與 schools 的 country_id 匹配
    const targetCountryId = String(countryId);
    
    console.log('[CountryBoard] 開始過濾學校:', {
      totalSchools: schools.length,
      targetCountryId,
      targetCountryIdType: typeof targetCountryId,
      sampleSchool: schools[0] ? {
        id: schools[0].id,
        name_zh: schools[0].name_zh,
        country_id: schools[0].country_id,
        country_idType: typeof schools[0].country_id,
      } : null,
    });
    
    const list = (schools || []).filter((s) => {
      // 確保 country_id 轉換為字符串進行比較
      const schoolCountryId = s.country_id != null ? String(s.country_id) : null;
      const matches = schoolCountryId === targetCountryId;
      
      if (matches) {
        console.log('[CountryBoard] 找到匹配的學校:', {
          schoolId: s.id,
          schoolName: s.name_zh,
          schoolCountryId,
          targetCountryId,
        });
      }
      
      return matches;
    });
    
    console.log('[CountryBoard] 過濾結果:', {
      matchedCount: list.length,
      totalSchools: schools.length,
      targetCountryId,
    });
    
    return list.slice().sort((a, b) => a.name_zh.localeCompare(b.name_zh, 'zh-Hant'));
  }, [schools, countryId, schoolsLoading]);

  const schoolScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollability = () => {
    if (!schoolScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = schoolScrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScrollability();
    const el = schoolScrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollability);
      return () => el.removeEventListener('scroll', checkScrollability);
    }
  }, [boardSchools]);

  const scrollSchools = (direction: 'left' | 'right') => {
    if (!schoolScrollRef.current) return;
    const scrollAmount = 280;
    schoolScrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Effect 1: 取得版面資訊，只依賴 countryId，不依賴 session
  // 避免 NextAuth refetchOnWindowFocus 造成切換分頁/桌面時重新 loading
  useEffect(() => {
    let cancelled = false;
    const fetchBoard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/boards/country/${countryId}`);
        const data: BoardInfoResponse = await res.json();
        if (!cancelled && data?.success) {
          setBoardId(data.board?.id || null);
          setStats(data.stats || { followerCount: 0, postCount: 0 });
          if (data.country) {
            setCountryInfo({
              country_zh: data.country.country_zh,
              country_en: data.country.country_en,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching board info:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (countryId) fetchBoard();
    return () => { cancelled = true; };
  }, [countryId]);

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

  // 獲取學校評分
  useEffect(() => {
    let cancelled = false;
    const fetchRatings = async () => {
      if (boardSchools.length === 0) return;
      
      try {
        const schoolIds = boardSchools.map((s) => String(s.id));
        const res = await fetch('/api/schools/ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schoolIds }),
        });
        const data = await res.json();
        if (!cancelled && data?.success) {
          setSchoolRatings(data.ratings || {});
        }
      } catch (err) {
        console.error('Error fetching school ratings:', err);
      }
    };
    fetchRatings();
    return () => {
      cancelled = true;
    };
  }, [boardSchools]);

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
    // AppShell 在 /social/boards/country/[id] 會加 pt-16，所以這裡用 (100vh - 64px) 鎖住整頁高度，避免 body 滾動
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

          <main className="h-full min-h-0 w-full min-w-0 max-w-[800px] flex-1 overflow-y-auto overscroll-contain bg-white md:mx-auto md:bg-[#F4F4F4]">
            <div className="mx-auto min-h-[60vh] w-full min-w-0 max-w-[800px] md:py-2">
            {loading || !countryInfo ? (
              <Card className="border-0 shadow-none overflow-hidden mb-4">
                <div className="bg-white p-6">
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
                  </div>
                </div>
              </Card>
            ) : (
              <>
            {/* Board info */}
            <Card className="mb-4 w-full max-w-[800px] overflow-hidden border-0 shadow-none max-md:rounded-none md:rounded-xl md:shadow-sm">
              <div className="h-32" style={{ backgroundColor: '#BAC7E5' }} />
              <div className="bg-white p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                  <div className="min-w-0 w-full flex-1 md:max-w-[540px]">
                    <div className="flex flex-wrap items-center gap-2">
                      {countryISO && <span className={`fi fi-${countryISO} shrink-0`} />}
                      <h2 className="text-2xl font-bold text-gray-800 md:text-4xl">{boardTitle}</h2>
                    </div>
                    {countryInfo?.country_en && (
                      <p className="mt-1 text-sm text-gray-500 md:mt-2">{countryInfo.country_en}</p>
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

                <div className="mt-6">
                  <div className="text-sm font-semibold" style={{ color: '#5A5A5A' }}>
                    學校清單
                  </div>
                </div>

                <div className="relative mt-3">
                  {boardSchools.length > 3 && canScrollLeft && (
                    <button
                      onClick={() => scrollSchools('left')}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md border border-gray-200"
                      style={{ marginLeft: '-12px' }}
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                  )}
                  <div
                    ref={schoolScrollRef}
                    className="flex gap-4 overflow-x-auto scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {boardSchools.map((s) => {
                      const rating = schoolRatings[String(s.id)];
                      const avgRating = rating?.avgRating ?? null;
                      const hasRating = avgRating !== null && avgRating > 0;
                      
                      return (
                        <Link key={s.id} href={`/social/boards/school/${s.id}`}>
                          <Card
                            className="flex-shrink-0 p-4 bg-white border border-gray-200 shadow-sm rounded-xl cursor-pointer hover:shadow-md transition-shadow"
                            style={{ width: '260px' }}
                          >
                            <div className="text-sm text-gray-700 font-medium">{s.name_zh}</div>
                            <div className="text-xs text-gray-400 mt-1">{s.name_en}</div>
                            <div className="flex items-center gap-2 mt-3">
                              {hasRating ? (
                                <>
                                  <div className="text-xs text-gray-600">{avgRating?.toFixed(1)}</div>
                                  <div className="flex items-center gap-0.5">
                                    {Array.from({ length: 5 }, (_v, i) => (
                                      <Star
                                        key={i}
                                        className={`h-3 w-3 ${
                                          i < Math.round(avgRating!)
                                            ? 'fill-[#8D7051] text-[#8D7051]'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="text-xs text-gray-400">N/A</div>
                                  <div className="flex items-center gap-0.5">
                                    {Array.from({ length: 5 }, (_v, i) => (
                                      <Star
                                        key={i}
                                        className="h-3 w-3 text-gray-300"
                                      />
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                  {boardSchools.length > 3 && canScrollRight && (
                    <button
                      onClick={() => scrollSchools('right')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-2 shadow-md border border-gray-200"
                      style={{ marginRight: '-12px' }}
                    >
                      <ChevronRight className="w-5 h-5 text-gray-700" />
                    </button>
                  )}
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
          <aside className="hidden sm:block sm:w-56 md:w-60 lg:w-64 flex-shrink-0">
            <SocialSidebar />
          </aside>
        </div>
      </div>

      {/* Bottom Navigation - Only visible on screens smaller than lg */}
      <SocialBottomNav />
    </div>
  );
}

export default function CountryBoardPage() {
  return (
    <RouteGuard>
      <CountryBoardContent />
    </RouteGuard>
  );
}


