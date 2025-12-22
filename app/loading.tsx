'use client';

import { useState } from 'react';

export default function Loading() {
  const [imgSrc, setImgSrc] = useState('/icon.svg');

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F4F4F4]">
      <div className="flex flex-col items-center gap-4">
        <img
          src={imgSrc}
          alt="Loading"
          className="h-16 w-auto animate-pulse"
          style={{ objectFit: 'contain' }}
          onError={() => {
            // Fallback to PNG if SVG fails
            setImgSrc('/favicon.png');
          }}
        />
        <p className="text-gray-500 text-sm">載入中...</p>
      </div>
    </div>
  );
}

