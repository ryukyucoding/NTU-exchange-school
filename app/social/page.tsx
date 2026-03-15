'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import RouteGuard from '@/components/auth/RouteGuard';
import FeatureTour from '@/components/onboarding/FeatureTour';
import SocialSidebar from '@/components/social/SocialSidebar';
import SocialBottomNav from '@/components/social/SocialBottomNav';
import PostList from '@/components/social/PostList';
import { SocialSearchInput } from '@/components/social/SocialSearchInput';
import { Button } from '@/components/ui/button';

function SocialContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const [hashtag, setHashtag] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState<string | null>(null);

  const searchFocus = searchParams.get('focus') === 'search';

  useEffect(() => {
    const hashtagParam = searchParams.get('hashtag');
    const qParam = searchParams.get('q');
    setHashtag(hashtagParam);
    setSearchQ(qParam || null);
  }, [searchParams]);

  const clearSearch = () => {
    router.push('/social?focus=search');
  };

  const searchChipClass =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-[#8D7051] transition-colors';
  const searchChipBg = 'rgba(141, 112, 81, 0.34)';
  const searchChipText = 'text-[#4a3828]';

  const filterButtons = (
    <div className="pointer-events-auto flex w-full max-w-md gap-2 md:max-w-[25%] md:min-w-[280px]">
          <Button
            onClick={() => setFilter('all')}
            style={{
              borderRadius: '9999px',
              boxShadow: 'none',
              ...(filter === 'all'
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
            className="h-9 flex-1 border text-xs shadow-none transition-colors"
          >
            所有貼文
          </Button>
          <Button
            onClick={() => setFilter('following')}
            style={{
              borderRadius: '9999px',
              boxShadow: 'none',
              ...(filter === 'following'
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
            className="h-9 flex-1 border text-xs shadow-none transition-colors"
          >
            追蹤中
          </Button>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-[#F4F4F4]">
      {/* 手機：篩選第二排白底；電腦：與 header 同列 */}
      <div
        className="fixed left-0 right-0 z-[51] flex justify-center bg-white px-3 md:top-0 md:h-16 md:items-center md:bg-transparent md:px-4 max-md:top-16 max-md:h-12 max-md:items-center"
        style={{ pointerEvents: 'none' }}
      >
        {filterButtons}
      </div>

      {/* 手機整欄白底與主欄固定寬度（max-w-[800px] 置中）；電腦維持灰底+側欄 */}
      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 overflow-hidden bg-white max-md:bg-white md:bg-[#F4F4F4] px-0 pb-16 pt-[calc(0.75rem+3rem)] max-md:pb-16 md:px-2 md:pb-6 md:pt-4 lg:pb-6">
        <div className="flex h-full min-h-0 w-full items-stretch justify-center gap-6 max-md:gap-0 md:mx-auto md:max-w-[1400px]">
          <aside className="hidden shrink-0 md:block md:w-16 lg:w-64" aria-hidden />

          {/* 電腦：圓角白框固定高度，捲動在框內 → 往上滑仍維持左右上圓角裁切；頂部與右欄對齊不加 py-2 */}
          <main className="flex h-full min-h-0 w-full min-w-0 max-w-[800px] flex-1 flex-col bg-white pr-px max-md:overflow-y-auto max-md:overflow-x-clip md:max-w-[800px] md:bg-[#F4F4F4] md:pr-0">
            <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[800px] max-md:min-h-full max-md:flex-1 flex-col max-md:overflow-y-auto md:h-full md:flex-1 md:overflow-hidden md:rounded-xl md:bg-white md:shadow-sm">
              {/* 電腦版：僅有 q 時顯示標籤列。手機版：僅在「搜尋模式」(focus=search) 或有 q 時顯示搜尋列 */}
              {searchQ ? (
                <div className="flex items-center gap-2 px-4 py-3 md:px-4 md:py-3 border-b border-[#e8e6e3]">
                  <button
                    type="button"
                    onClick={clearSearch}
                    className={`${searchChipClass} ${searchChipText}`}
                    style={{ backgroundColor: searchChipBg }}
                    aria-label="取消搜尋"
                  >
                    <span>{searchQ}</span>
                    <X className="w-3.5 h-3.5 shrink-0 text-[#6b5b4c] hover:text-[#4a3828]" />
                  </button>
                </div>
              ) : (searchFocus && (
                <div className="sm:hidden flex items-center px-4 py-3 border-b border-[#e8e6e3]">
                  <SocialSearchInput variant="dialog" className="w-full h-11" />
                </div>
              ))}
              <div className="min-h-[60vh] flex-1 overflow-y-auto overscroll-contain max-md:min-h-full md:min-h-0 md:p-4">
                {/* 手機搜尋模式且尚未輸入關鍵字：顯示空狀態；桌面維持顯示貼文 */}
                {searchFocus && !searchQ ? (
                  <>
                    <div className="sm:hidden flex flex-col items-center justify-center py-16 text-[#8a7a63] text-sm">
                      <p>輸入關鍵字搜尋貼文</p>
                      <p className="mt-1 text-xs">可搜尋標題、內文與標籤</p>
                    </div>
                    <div className="hidden sm:block">
                      <PostList filter={filter} hashtag={hashtag} q={searchQ} />
                    </div>
                  </>
                ) : (
                  <PostList filter={filter} hashtag={hashtag} q={searchQ} />
                )}
              </div>
            </div>
          </main>

          {/* Right Sidebar - fixed width, hidden below sm (640px) */}
          <aside className="hidden sm:block sm:w-56 md:w-60 lg:w-64 flex-shrink-0">
            <SocialSidebar />
          </aside>
        </div>
      </div>

      {/* Bottom Navigation - Only visible on screens smaller than sm (640px) */}
      <SocialBottomNav />
    </div>
  );
}

export default function SocialPage() {
  return (
    <RouteGuard>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">載入中...</div>}>
        <SocialContent />
        <FeatureTour tourType="social" />
      </Suspense>
    </RouteGuard>
  );
}

