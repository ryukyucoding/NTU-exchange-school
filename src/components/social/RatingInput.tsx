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
  description,
  onDescriptionChange,
  placeholder,
  maxLength = 500,
}: RatingInputProps) {
  const maxValue = type === 'stars' ? 5 : 3;

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-5 h-5 cursor-pointer transition-colors ${
          value > 0 && i < value ? 'fill-[#8D7051] text-[#8D7051]' : 'text-gray-300'
        }`}
        onClick={() => onChange(i + 1)}
      />
    ));
  };

  const renderDollarSigns = () => {
    return Array.from({ length: 3 }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => onChange(i + 1)}
        className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
          value > 0 && i < value
            ? 'bg-[#8D7051] text-white'
            : 'bg-gray-100 text-gray-400'
        }`}
      >
        {'$'.repeat(i + 1)}
      </button>
    ));
  };

  return (
    <div className="py-4">
      <div className="flex items-center gap-4">
        <Label className="text-base font-semibold" style={{ color: '#5A5A5A' }}>{label}</Label>
        <div className="flex items-center gap-2">
          {type === 'stars' ? (
            <div className="flex items-center gap-1">{renderStars()}</div>
          ) : (
            <div className="flex items-center gap-2">{renderDollarSigns()}</div>
          )}
        </div>
      </div>
    </div>
  );
}

