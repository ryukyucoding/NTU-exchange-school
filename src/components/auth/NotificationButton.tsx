'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import NotificationList from '@/components/notifications/NotificationList';
import { useNotifications } from '@/contexts/NotificationContext';

export default function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { hasUnread, setHasUnread } = useNotifications();

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

