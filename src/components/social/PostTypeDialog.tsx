'use client';

import { useRouter, usePathname, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { useSchoolContext } from '@/contexts/SchoolContext';

interface PostTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: { top: number; left: number; width: number } | null;
}

export default function PostTypeDialog({ open, onOpenChange, position }: PostTypeDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { schools } = useSchoolContext();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [boardInfo, setBoardInfo] = useState<{ countryName?: string; schoolId?: string } | null>(null);

  // 獲取當前版面的國家/學校資訊
  useEffect(() => {
    const fetchBoardInfo = async () => {
      // 判斷是否在國家板
      if (pathname?.startsWith('/social/boards/country/')) {
        const countryId = params?.countryId as string;
        if (countryId) {
          try {
            const res = await fetch(`/api/boards/country/${countryId}`);
            const data = await res.json();
            if (data?.success && data.country) {
              setBoardInfo({
                countryName: data.country.country_zh, // 使用中文國家名
              });
            }
          } catch (error) {
            console.error('Error fetching country board info:', error);
          }
        }
      }
      // 判斷是否在學校板
      else if (pathname?.startsWith('/social/boards/school/')) {
        const schoolId = params?.schoolId as string;
        if (schoolId && schools.length > 0) {
          const school = schools.find(s => String(s.id) === String(schoolId));
          if (school) {
            setBoardInfo({
              schoolId: String(school.id),
              countryName: school.country, // 學校的國家名稱
            });
          }
        }
      }
      // 其他頁面（如 /social）不預填
      else {
        setBoardInfo(null);
      }
    };

    if (open) {
      fetchBoardInfo();
    }
  }, [pathname, params, schools, open]);

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
    const basePath = type === 'general' ? '/social/post/general' : '/social/post/review';
    
    // 構建 URL 參數
    const params = new URLSearchParams();
    if (boardInfo?.countryName) {
      params.append('countryName', boardInfo.countryName);
    }
    if (boardInfo?.schoolId) {
      params.append('schoolId', boardInfo.schoolId);
    }
    // 記錄當前頁面作為返回 URL
    const currentUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/social';
    params.append('return', currentUrl);
    
    const pathWithReturn = params.toString() ? `${basePath}?${params.toString()}` : basePath;
    
    // 先關閉對話框
    onOpenChange(false);
    // 等待一個 tick 確保對話框關閉動畫完成，然後導航
    await new Promise(resolve => setTimeout(resolve, 100));
    router.push(pathWithReturn);
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

