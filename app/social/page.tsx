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

  return (
    // AppShell 在 /social 會加 pt-16，所以這裡用 (100vh - 64px) 鎖住整頁高度，避免 body 滾動
    <div className="h-[calc(100vh-64px)] bg-[#F4F4F4] overflow-hidden flex flex-col">
      {/* Filter buttons - 固定在 header 内部居中 */}
      <div 
        className="fixed top-0 left-0 right-0 z-[51] flex justify-center items-center"
        style={{ 
          height: '64px', // header 的高度
          pointerEvents: 'none' // 让点击事件穿透
        }}
      >
        <div className="flex gap-2 pointer-events-auto" style={{ width: '25%' }}>
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
                className="flex-1 text-xs py-1 border transition-colors shadow-none"
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
                className="flex-1 text-xs py-1 border transition-colors shadow-none"
              >
                追蹤中
              </Button>
        </div>
      </div>

      {/* Content Frame: min-h-0 so flex child can shrink and scroll */}
      <div className="max-w-[1400px] mx-auto px-2 pb-20 pt-4 flex-1 min-h-0 overflow-hidden lg:pb-6">
        <div className="flex gap-6 items-stretch justify-center h-full min-h-0">
          {/* Left spacer - keeps three-column layout on md+ */}
          <aside className="hidden md:block md:w-16 lg:w-64 flex-shrink-0" aria-hidden />

          {/* Main - flexible width up to 800px, only scrollable area */}
          <main className="min-w-0 flex-1 max-w-[800px] h-full min-h-0 overflow-y-auto overscroll-contain">
            <div className="w-full min-w-0 min-h-[60vh]">
              <PostList filter={filter} hashtag={hashtag} />
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

