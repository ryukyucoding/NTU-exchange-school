'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useEffect, useRef } from 'react';

interface PostTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: { top: number; left: number; width: number } | null;
}

export default function PostTypeDialog({ open, onOpenChange, position }: PostTypeDialogProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onOpenChange]);

  const handleSelectType = async (type: 'general' | 'review') => {
    const path = type === 'general' ? '/social/post/general' : '/social/post/review';
    // 先關閉對話框
    onOpenChange(false);
    // 等待一個 tick 確保對話框關閉動畫完成，然後導航
    await new Promise(resolve => setTimeout(resolve, 100));
    router.push(path);
  };

  if (!open || !position) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed z-50 bg-white border border-[#d6c3a1] rounded-lg shadow-lg p-4"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
      }}
    >
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSelectType('general');
          }}
          className="w-full py-3 text-sm bg-transparent border border-[#8D7051] text-[#8D7051] hover:bg-transparent hover:opacity-80"
        >
          我有話要說
        </Button>
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSelectType('review');
          }}
          className="w-full py-3 text-sm bg-transparent border border-[#8D7051] text-[#8D7051] hover:bg-transparent hover:opacity-80"
        >
          學校心得文
        </Button>
      </div>
    </div>
  );
}

