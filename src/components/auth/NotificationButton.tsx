'use client';

import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

export default function NotificationButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="bg-white border border-[#b08a63] text-[#4a3828] hover:bg-[#f7efe5] w-10 h-10 rounded-full"
      aria-label="通知"
    >
      <Bell className="w-5 h-5" />
    </Button>
  );
}

