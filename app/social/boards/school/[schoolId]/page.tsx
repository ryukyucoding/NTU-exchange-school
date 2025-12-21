'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import RouteGuard from '@/components/auth/RouteGuard';
import SocialSidebar from '@/components/social/SocialSidebar';
import PostList from '@/components/social/PostList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSchoolContext } from '@/contexts/SchoolContext';

type SortMode = 'popular' | 'latest';

interface BoardInfoResponse {
  success: boolean;
  board: { id: string | null; name: string; schoolId?: string | null } | null;
  stats: { followerCount: number; postCount: number };
}

function SchoolBoardContent() {
  const params = useParams<{ schoolId: string }>();
  const schoolId = params?.schoolId || '';

  const { schools } = useSchoolContext();
  const school = useMemo(() => (schools || []).find((s) => s.id === schoolId), [schools, schoolId]);
  const boardTitle = school ? `${school.name_zh}版` : '學校版';

  const [boardId, setBoardId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ followerCount: number; postCount: number }>({
    followerCount: 0,
    postCount: 0,
  });
  const [sort, setSort] = useState<SortMode>('popular');
  const [loading, setLoading] = useState(true);

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
  }, [schoolId]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgba(244, 244, 244, 1)' }}>
      {/* Topic Frame */}
      <div className="sticky top-16 z-40 py-4 border-b border-transparent">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center">
            <div
              className="flex items-center justify-center"
              style={{
                width: '180px',
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

      <div className="max-w-7xl mx-auto px-4 pb-6 pt-4">
        <div className="flex gap-6 items-start justify-center">
          <aside className="hidden md:block w-64 flex-shrink-0" />

          <main
            className="w-[800px] flex-shrink-0"
            style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}
          >
            <Card className="border-0 shadow-none overflow-hidden mb-4">
              <div className="h-32" style={{ backgroundColor: '#BAC7E5' }} />
              <div className="bg-white p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-4xl font-bold text-gray-800">{boardTitle}</h2>
                    {school && (
                      <p className="text-gray-500 mt-2">
                        {school.name_en} · {school.country}
                      </p>
                    )}
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
              </div>
            </Card>

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

            {loading && !boardId ? (
              <div className="bg-white p-8 rounded-lg">
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">載入中...</p>
                </div>
              </div>
            ) : (
              <PostList filter="all" boardId={boardId} sort={sort === 'popular' ? 'popular' : 'latest'} />
            )}
          </main>

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

export default function SchoolBoardPage() {
  return (
    <RouteGuard>
      <SchoolBoardContent />
    </RouteGuard>
  );
}


