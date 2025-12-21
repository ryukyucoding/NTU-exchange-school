'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import RouteGuard from '@/components/auth/RouteGuard';
import SocialSidebar from '@/components/social/SocialSidebar';
import PostList from '@/components/social/PostList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSchoolContext } from '@/contexts/SchoolContext';

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
    <div className="min-h-screen" style={{ backgroundColor: 'rgba(244, 244, 244, 1)' }}>
      {/* Topic Frame */}
      {boardTitle && (
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
      )}

      <div className="max-w-7xl mx-auto px-4 pb-6 pt-4">
        <div className="flex gap-6 items-start justify-center">
          <aside className="hidden md:block w-64 flex-shrink-0" />

          <main
            className="w-[800px] flex-shrink-0"
            style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}
          >
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
                  <div>
                    <h2 className="text-4xl font-bold text-gray-800">{boardTitle}</h2>
                    {school && (
                      <p className="text-gray-500 mt-2">
                        {school.name_en} {school.country}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-6">
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

                {/* Rating display */}
                {avgRatings.livingConvenience > 0 || avgRatings.costOfLiving > 0 || avgRatings.courseLoading > 0 ? (
                  <div className="mt-6 flex gap-8">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">生活機能</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">
                          {avgRatings.livingConvenience.toFixed(1)}
                        </span>
                        <div className="flex text-[#8D7051] text-sm">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i}>{i < Math.round(avgRatings.livingConvenience) ? '★' : '☆'}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">學習體驗</div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">
                          {avgRatings.courseLoading.toFixed(1)}
                        </span>
                        <div className="flex text-[#8D7051] text-sm">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i}>{i < Math.round(avgRatings.courseLoading) ? '★' : '☆'}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">生活開銷</div>
                      <div className="flex items-center gap-1">
                        <div className="flex text-[#8D7051] text-base">
                          {Array.from({ length: 5 }, (_, i) => (
                            <span key={i} style={{ fontSize: '16px' }}>
                              {i < Math.round(avgRatings.costOfLiving) ? '$' : '○'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

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
                    全部
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


