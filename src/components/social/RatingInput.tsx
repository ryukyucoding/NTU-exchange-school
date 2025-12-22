'use client';

import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';

interface RatingInputProps {
  label: string;
  type: 'stars' | 'dollar';
  value: number;
  onChange: (value: number) => void;
  description?: string;
  onDescriptionChange?: (description: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export default function RatingInput({
  label,
  type,
  value,
  onChange,
}: RatingInputProps) {
  const getStarDescription = (rating: number) => {
    const descriptions = ['', '很差', '較差', '普通', '良好', '優秀'];
    return descriptions[rating] || '';
  };

  const getDollarDescription = (rating: number) => {
    const descriptions = ['', '經濟實惠', '普通', '較為高消費'];
    return descriptions[rating] || '';
  };

  const renderStars = () => {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_v, i) => (
            <Star
              key={i}
              className={`w-5 h-5 cursor-pointer transition-colors ${
                value > 0 && i < value ? 'fill-[#8D7051] text-[#8D7051]' : 'text-gray-300'
              }`}
              onClick={() => onChange(i + 1)}
            />
          ))}
        </div>
        {value > 0 && (
          <span className="text-sm" style={{ color: '#999999' }}>
            {getStarDescription(value)}
          </span>
        )}
      </div>
    );
  };

  const renderDollarSigns = () => {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          {Array.from({ length: 3 }, (_v, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i + 1)} // 改为单选：点击哪个就设为哪个值
              className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                value === i + 1 // 改为单选：只有选中的才高亮
                  ? 'bg-[#8D7051] text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {'$'.repeat(i + 1)}
            </button>
          ))}
        </div>
        {value > 0 && (
          <span className="text-sm" style={{ color: '#999999' }}>
            {getDollarDescription(value)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="py-4">
      <div className="flex items-center gap-4">
        <Label className="text-base font-semibold" style={{ color: '#5A5A5A' }}>{label}</Label>
        <div className="flex items-center gap-2">
          {type === 'stars' ? renderStars() : renderDollarSigns()}
        </div>
      </div>
    </div>
  );
}

