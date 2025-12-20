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
    <div className="min-h-screen bg-[#F3F3F3]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6 items-start">
          {/* Left Sidebar - Empty but keeps layout structure */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            {/* Empty sidebar to maintain three-column layout */}
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-2xl">
            <div className="mb-4 flex justify-center">
              <div className="flex gap-2" style={{ width: '25%' }}>
                <Button
                  onClick={() => setFilter('all')}
                  style={{
                    borderRadius: '9999px',
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
                  className="flex-1 text-xs py-1 border transition-colors"
                >
                  所有貼文
                </Button>
                <Button
                  onClick={() => setFilter('following')}
                  style={{
                    borderRadius: '9999px',
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
                  className="flex-1 text-xs py-1 border transition-colors"
                >
                  追蹤中
                </Button>
              </div>
            </div>
            <PostList filter={filter} />
          </main>

          {/* Right Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <SocialSidebar />
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

