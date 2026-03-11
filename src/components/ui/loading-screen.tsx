'use client';

import { useState } from 'react';

interface LoadingScreenProps {
  className?: string;
  text?: string;
}

export default function LoadingScreen({ className, text = '載入中...' }: LoadingScreenProps) {
  const [imgSrc, setImgSrc] = useState('/icon.svg');

  return (
    <div className={`flex items-center justify-center ${className ?? 'min-h-screen bg-[#F4F4F4]'}`}>
      <div className="flex flex-col items-center gap-4">
        <img
          src={imgSrc}
          alt="Loading"
          className="h-16 w-auto animate-bounce"
          style={{ objectFit: 'contain' }}
          onError={() => setImgSrc('/favicon.png')}
        />
        <p className="text-gray-500 text-sm">{text}</p>
      </div>
    </div>
  );
}
