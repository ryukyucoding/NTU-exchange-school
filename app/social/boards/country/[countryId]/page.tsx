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

  useEffect(() => {
    let cancelled = false;
    const fetchBoard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/boards/country/${countryId}`);
        const data: BoardInfoResponse = await res.json();
        if (!cancelled && data?.success) {
          const bid = data.board?.id || null;
          setBoardId(bid);
          setStats(data.stats || { followerCount: 0, postCount: 0 });
          
          // 設置國家資訊
          if (data.country) {
            setCountryInfo({
              country_zh: data.country.country_zh,
              country_en: data.country.country_en,
            });
          }
          
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
    if (countryId) fetchBoard();
    return () => {
      cancelled = true;
    };
  }, [countryId, session]);

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

      {/* Content Frame */}
      <div className="max-w-[1400px] mx-auto px-2 pb-20 pt-4 flex-1 overflow-hidden lg:pb-6">
        <div className="flex gap-6 items-start justify-center h-full">
          {/* Left Sidebar placeholder */}
          <aside className="hidden md:block w-64 flex-shrink-0" />

          {/* Main (ONLY scrollable area) */}
          <main className="w-[800px] md:w-[500px] lg:w-[800px] flex-shrink-0 h-full overflow-y-auto overscroll-contain">
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
            <Card className="border-0 shadow-none overflow-hidden mb-4">
              <div className="h-32" style={{ backgroundColor: '#BAC7E5' }} />
              <div className="bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 max-w-[540px]">
                    <div className="flex items-center gap-2">
                      {countryISO && <span className={`fi fi-${countryISO}`} />}
                      <h2 className="text-4xl font-bold text-gray-800">{boardTitle}</h2>
                    </div>
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
          </main>

          {/* Right Sidebar (fixed, does NOT scroll) */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
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


