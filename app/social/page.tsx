'use client';

import { useState } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import SocialSidebar from '@/components/social/SocialSidebar';
import PostList from '@/components/social/PostList';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

function SocialContent() {
  const [filter, setFilter] = useState<'all' | 'following'>('all');

  return (
    <div className="min-h-screen bg-[#F4F4F4]">
      {/* Header section is handled by AppShell (sidebar button) and UserMenu (notification + profile) */}
      
      {/* Topic Frame: Filter buttons section - fixed under header */}
      <div className="sticky top-16 z-40 py-4 border-b border-transparent">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center">
            <div className="flex gap-2" style={{ width: '25%' }}>
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
        </div>
      </div>

      {/* Content Frame: Main content area with posts and sidebar */}
      <div className="max-w-7xl mx-auto px-4 pb-6 pt-4">
        <div className="flex gap-6 items-start justify-center">
          {/* Left Sidebar - Empty but keeps layout structure */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            {/* Empty sidebar to maintain three-column layout */}
          </aside>

          {/* Main Content - Posts (scrollable) */}
          <main className="w-[800px] flex-shrink-0" style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}>
            <PostList filter={filter} />
          </main>

          {/* Right Sidebar - Fixed */}
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

export default function SocialPage() {
  return (
    <RouteGuard>
      <SocialContent />
    </RouteGuard>
  );
}

