'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RouteGuard from '@/components/auth/RouteGuard';
import FeatureTour from '@/components/onboarding/FeatureTour';
import SocialSidebar from '@/components/social/SocialSidebar';
import SocialBottomNav from '@/components/social/SocialBottomNav';
import PostList from '@/components/social/PostList';
import { Button } from '@/components/ui/button';

function SocialContent() {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const [hashtag, setHashtag] = useState<string | null>(null);

  useEffect(() => {
    const hashtagParam = searchParams.get('hashtag');
    setHashtag(hashtagParam);
  }, [searchParams]);

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
              <div className="min-h-[60vh] flex-1 overflow-y-auto overscroll-contain max-md:min-h-full md:min-h-0 md:p-4">
                <PostList filter={filter} hashtag={hashtag} />
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

