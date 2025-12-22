'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function CountryBoardByNamePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const countryName = searchParams.get('name');

  useEffect(() => {
    if (!countryName) {
      router.push('/social');
      return;
    }

    // 查找國家看板
    fetch(`/api/boards/country/by-name?name=${encodeURIComponent(countryName)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.boardId) {
          // 跳轉到看板頁面
          router.push(`/social/boards/${data.boardId}`);
        } else {
          // 如果找不到，返回社群主頁
          router.push('/social');
        }
      })
      .catch(() => {
        router.push('/social');
      });
  }, [countryName, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400 mx-auto"></div>
        <p className="mt-4 text-gray-600">載入中...</p>
      </div>
    </div>
  );
}

