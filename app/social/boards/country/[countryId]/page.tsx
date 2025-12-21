'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import RouteGuard from '@/components/auth/RouteGuard';
import SocialSidebar from '@/components/social/SocialSidebar';
import PostList from '@/components/social/PostList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { getCountryISO } from '@/utils/countryFlags';

type SortMode = 'popular' | 'latest';

interface BoardInfoResponse {
  success: boolean;
  board: { id: string | null; name: string; country_id?: string | null } | null;
  stats: { followerCount: number; postCount: number };
  country?: { country_zh: string; country_en: string; continent: string } | null;
}

function CountryBoardContent() {
  const params = useParams<{ countryId: string }>();
  const encodedCountry = params?.countryId || '';
  const countryName = useMemo(() => decodeURIComponent(encodedCountry), [encodedCountry]);

  const { schools } = useSchoolContext();

  const [boardId, setBoardId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ followerCount: number; postCount: number }>({
    followerCount: 0,
    postCount: 0,
  });
  const [sort, setSort] = useState<SortMode>('popular');
  const [loading, setLoading] = useState(true);

  const boardTitle = `${countryName}版`;

  const countryISO = useMemo(() => getCountryISO(countryName), [countryName]);

  const boardSchools = useMemo(() => {
    const list = (schools || []).filter(
      (s) => s.country === countryName || s.country_en === countryName
    );
    return list
      .slice()
      .sort((a, b) => a.name_zh.localeCompare(b.name_zh, 'zh-Hant'))
      .slice(0, 3);
  }, [schools, countryName]);

  useEffect(() => {
    let cancelled = false;
    const fetchBoard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/boards/country/${encodeURIComponent(countryName)}`);
        const data: BoardInfoResponse = await res.json();
        if (!cancelled && data?.success) {
          setBoardId(data.board?.id || null);
          setStats(data.stats || { followerCount: 0, postCount: 0 });
        }
      } catch (err) {
        console.error('Error fetching board info:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (countryName) fetchBoard();
    return () => {
      cancelled = true;
    };
  }, [countryName]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgba(244, 244, 244, 1)' }}>
      {/* Topic Frame */}
      <div className="sticky top-16 z-40 py-4 border-b border-transparent">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center">
            <div
              className="flex items-center justify-center"
              style={{
                width: '140px',
                height: '32px',
                border: '1px solid #5A5A5A',
                borderRadius: '24px',
                boxSizing: 'border-box',
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
                {boardTitle}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content Frame */}
      <div className="max-w-7xl mx-auto px-4 pb-6 pt-4">
        <div className="flex gap-6 items-start justify-center">
          {/* Left Sidebar placeholder */}
          <aside className="hidden md:block w-64 flex-shrink-0" />

          {/* Main */}
          <main
            className="w-[800px] flex-shrink-0"
            style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}
          >
            {/* Board info */}
            <Card className="border-0 shadow-none overflow-hidden mb-4">
              <div className="h-32" style={{ backgroundColor: '#BAC7E5' }} />
              <div className="bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {countryISO && <span className={`fi fi-${countryISO}`} />}
                      <h2 className="text-4xl font-bold text-gray-800">{boardTitle}</h2>
                    </div>
                    <p className="text-gray-500 mt-2">學校清單</p>
                  </div>
                  <div className="flex gap-10 text-gray-600">
                    <div className="text-right">
                      <div className="text-sm">貼文數</div>
                      <div className="text-xl font-semibold">{stats.postCount}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">追蹤數</div>
                      <div className="text-xl font-semibold">{stats.followerCount}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-6">
                  {boardSchools.map((s) => (
                    <Card
                      key={s.id}
                      className="p-4 bg-white border border-gray-200 shadow-sm rounded-xl"
                    >
                      <div className="text-sm text-gray-700 font-medium">{s.name_zh}</div>
                      <div className="text-xs text-gray-400 mt-1">{s.name_en}</div>
                      <div className="flex items-center gap-2 mt-3">
                        <div className="text-xs text-gray-600">4.2</div>
                        <div className="text-[#8D7051] text-sm">★★★★☆</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </Card>

            {/* Sort toggle */}
            <div className="flex justify-center mb-4">
              <div className="flex gap-2" style={{ width: '35%' }}>
                <Button
                  onClick={() => setSort('popular')}
                  style={{
                    borderRadius: '9999px',
                    boxShadow: 'none',
                    ...(sort === 'popular'
                      ? {
                          backgroundColor: 'rgba(141, 112, 81, 0.34)',
                          borderColor: '#8D7051',
                          color: 'white',
                        }
                      : {
                          backgroundColor: 'transparent',
                          borderColor: '#8D7051',
                          color: '#8D7051',
                        }),
                  }}
                  className="flex-1 text-xs py-1 border transition-colors shadow-none"
                >
                  熱門
                </Button>
                <Button
                  onClick={() => setSort('latest')}
                  style={{
                    borderRadius: '9999px',
                    boxShadow: 'none',
                    ...(sort === 'latest'
                      ? {
                          backgroundColor: 'rgba(141, 112, 81, 0.34)',
                          borderColor: '#8D7051',
                          color: 'white',
                        }
                      : {
                          backgroundColor: 'transparent',
                          borderColor: '#8D7051',
                          color: '#8D7051',
                        }),
                  }}
                  className="flex-1 text-xs py-1 border transition-colors shadow-none"
                >
                  最新
                </Button>
              </div>
            </div>

            {/* Posts */}
            {loading && !boardId ? (
              <div className="bg-white p-8 rounded-lg">
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">載入中...</p>
                </div>
              </div>
            ) : (
              <PostList
                filter="all"
                boardId={boardId}
                sort={sort === 'popular' ? 'popular' : 'latest'}
              />
            )}
          </main>

          {/* Right Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky" style={{ top: '6rem' }}>
              <SocialSidebar />
            </div>
          </aside>
        </div>
      </div>
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


