'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { cleanMarkdown } from '@/utils/markdown';

interface RepostPreviewProps {
  originalPost: {
    id: string;
    title: string;
    content: string;
    author: {
      id: string;
      name: string | null;
      userID: string | null;
      image?: string | null;
    };
    createdAt: string;
    schools?: { id: string; name_zh: string; name_en: string; country: string }[];
    countries?: string[];
    hashtags?: string[];
  };
  onClick?: () => void;
}

export default function RepostPreview({ originalPost, onClick }: RepostPreviewProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/social/posts/${originalPost.id}`);
    }
  };

  // 清理並截斷內容
  const cleanedContent = cleanMarkdown(originalPost.content).replace(/\n/g, ' ').trim();
  const truncatedContent = cleanedContent.length > 150 
    ? cleanedContent.substring(0, 150) + '...' 
    : cleanedContent;

  // 收集所有國家
  const countries = originalPost.countries && originalPost.countries.length > 0
    ? originalPost.countries
    : (originalPost.schools 
        ? [...new Set(originalPost.schools.map(s => s.country).filter(Boolean))]
        : []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <Card 
      className="p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={handleClick}
    >
      {/* 作者資訊 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0">
          {originalPost.author?.image && (
            <img
              src={originalPost.author.image}
              alt={originalPost.author.name || 'User'}
              className="w-full h-full rounded-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: '#5A5A5A' }}>
              {originalPost.author.name || originalPost.author.userID || 'Unknown User'}
            </span>
            <span className="text-sm" style={{ color: '#5A5A5A' }}>·</span>
            <span className="text-sm" style={{ color: '#5A5A5A' }}>{formatDate(originalPost.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* 標題 */}
      <h3 className="text-lg font-semibold mb-2" style={{ color: '#5A5A5A' }}>
        {originalPost.title}
      </h3>

      {/* 國家和學校標籤 */}
      {(countries.length > 0 || (originalPost.schools && originalPost.schools.length > 0) || (originalPost.hashtags && originalPost.hashtags.length > 0)) && (
        <div className="flex flex-wrap gap-2 mb-2">
          {countries.map((country, index) => (
            <span
              key={`country-${index}`}
              className="px-2 py-1 rounded-full text-xs"
              style={{
                backgroundColor: 'rgba(186, 199, 229, 0.41)',
                border: '1px solid #BAC7E5',
                color: '#5A5A5A',
              }}
            >
              {country}
            </span>
          ))}
          {originalPost.schools && originalPost.schools.map((school, index) => (
            <span
              key={`school-${index}`}
              className="px-2 py-1 rounded-full text-xs"
              style={{
                backgroundColor: 'rgba(186, 199, 229, 0.41)',
                border: '1px solid #BAC7E5',
                color: '#5A5A5A',
              }}
            >
              {school.name_zh || school.name_en}
            </span>
          ))}
          {originalPost.hashtags && originalPost.hashtags.map((tag, index) => (
            <span
              key={`tag-${index}`}
              className="px-2 py-1 rounded-full text-xs"
              style={{
                backgroundColor: 'rgba(141, 112, 81, 0.34)',
                border: '1px solid #8D7051',
                color: '#5A5A5A',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 內容預覽 */}
      <p className="text-sm" style={{ color: '#5A5A5A' }}>
        {truncatedContent}
      </p>
    </Card>
  );
}

