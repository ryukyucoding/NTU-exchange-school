'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SocialSearchInputProps {
  /** 送出後導向 /social?q=...，若為 true 則在手機版可關閉對話框等 */
  onSubmitted?: () => void;
  className?: string;
  /** 用於桌面 sidebar：較小、圓角 pill；用於 dialog 可較大 */
  variant?: 'sidebar' | 'dialog';
  defaultValue?: string;
}

export function SocialSearchInput({
  onSubmitted,
  className,
  variant = 'sidebar',
  defaultValue = '',
}: SocialSearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  const submit = useCallback(() => {
    const q = value.trim();
    if (q) {
      router.push(`/social?q=${encodeURIComponent(q)}`);
      onSubmitted?.();
    } else {
      router.push('/social');
      onSubmitted?.();
    }
  }, [value, router, onSubmitted]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  const isSidebar = variant === 'sidebar';

  return (
    <div
      className={cn(
        'relative flex items-center w-full rounded-lg border border-[#e8e6e3] transition-colors focus-within:border-[#d6c3a1]/50',
        isSidebar ? 'h-9' : 'h-11 rounded-xl',
        className
      )}
    >
      <Search
        className={cn(
          'shrink-0 text-[#6b5b4c]',
          isSidebar ? 'ml-3 h-4 w-4' : 'ml-4 h-5 w-5'
        )}
        aria-hidden
      />
      <Input
        type="search"
        placeholder="搜尋貼文"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className={cn(
          'h-full flex-1 border-0 bg-transparent pl-2 pr-4 text-[#4a3828] placeholder:text-[#a89a8a] focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none',
          isSidebar ? 'rounded-lg text-sm' : 'rounded-xl text-base',
          isSidebar ? 'min-w-0' : ''
        )}
        aria-label="搜尋貼文"
      />
    </div>
  );
}
