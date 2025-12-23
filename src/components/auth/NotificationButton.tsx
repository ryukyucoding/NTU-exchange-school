'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import NotificationList from '@/components/notifications/NotificationList';
import { usePusher } from '@/hooks/usePusher';

export default function NotificationButton() {
  const { data: session } = useSession();
  const [hasUnread, setHasUnread] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // 檢查未讀通知
  const checkUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setHasUnread(data.hasUnread);
      }
    } catch (error) {
      console.error('Error checking unread notifications:', error);
    }
  }, [setHasUnread]);

  // 處理 Pusher 即時通知
  const handleNewNotification = useCallback(() => {
    console.log('[NotificationButton] New notification received from Pusher');
    setHasUnread(true);
    // 可以在這裡添加音效或動畫
  }, [setHasUnread]);

  // 訂閱 Pusher 即時通知
  usePusher({
    userId: session?.user?.id,
    onNewNotification: handleNewNotification,
  });

  // 輪詢檢查未讀通知（作為備援，每 5 分鐘一次）
  useEffect(() => {
    checkUnread();
    const interval = setInterval(checkUnread, 5 * 60 * 1000); // 5 分鐘
    return () => clearInterval(interval);
  }, [checkUnread]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="group relative bg-white border border-[#b08a63] text-[#4a3828] hover:bg-[#f7efe5] hover:text-[#b08a63] w-10 h-10 rounded-full"
          aria-label="通知"
        >
          <Bell className="w-5 h-5 group-hover:text-[#b08a63]" />
          {hasUnread && (
            <span
              className="absolute w-3 h-3 rounded-full"
              style={{
                backgroundColor: '#BAC7E5',
                top: '0px',
                right: '0px'
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 border-0 shadow-lg" align="end">
        <NotificationList
          onNotificationRead={() => setHasUnread(false)}
          onClose={() => setIsOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

