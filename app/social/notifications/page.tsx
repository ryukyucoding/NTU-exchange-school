'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import SocialSidebar from '@/components/social/SocialSidebar';
import SocialBottomNav from '@/components/social/SocialBottomNav';
import NotificationList from '@/components/notifications/NotificationList';
import { useNotifications } from '@/contexts/NotificationContext';

function NotificationsContent() {
  const { setHasUnread } = useNotifications();

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-[#F4F4F4] max-md:bg-white">
      {/* 標題列：與看板/個人頁一致 */}
      <div
        className="fixed left-0 right-0 z-[51] flex items-center justify-center border-b border-gray-100 bg-white md:top-0 md:h-16 md:border-b-0 md:bg-transparent max-md:top-16 max-md:h-12"
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="pointer-events-auto flex items-center justify-center rounded-full border border-[#5A5A5A] bg-transparent px-4 py-1 max-md:bg-white"
          style={{ minWidth: '96px' }}
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
            通知
          </h1>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 overflow-hidden bg-white px-0 pb-20 pt-14 md:bg-[#F4F4F4] md:px-2 md:pb-6 md:pt-4 lg:pb-6">
        <div className="flex h-full min-h-0 w-full items-stretch justify-center gap-6">
          <aside className="hidden shrink-0 md:block md:w-16 lg:w-64" aria-hidden />

          <main className="flex h-full min-h-0 w-full min-w-0 max-w-[800px] flex-1 flex-col bg-white pr-px max-md:overflow-y-auto md:max-w-[800px] md:bg-[#F4F4F4] md:pr-0">
            <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[800px] max-md:min-h-full max-md:flex-1 flex-col max-md:overflow-y-auto md:h-full md:flex-1 md:overflow-hidden md:rounded-xl md:bg-white md:shadow-sm">
              <div className="min-h-[60vh] flex-1 flex flex-col overflow-hidden max-md:min-h-full md:min-h-0 max-md:min-h-0">
                <NotificationList
                  onNotificationRead={() => setHasUnread(false)}
                  onClose={() => {}}
                  showHeader={false}
                  fullPage
                />
              </div>
            </div>
          </main>

          <aside className="hidden sm:block sm:w-56 md:w-60 lg:w-64 flex-shrink-0">
            <SocialSidebar />
          </aside>
        </div>
      </div>

      <SocialBottomNav />
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RouteGuard>
      <NotificationsContent />
    </RouteGuard>
  );
}
