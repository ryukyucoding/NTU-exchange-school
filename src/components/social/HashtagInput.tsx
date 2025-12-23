'use client';

import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { X } from 'lucide-react';

interface HashtagInputProps {
  hashtags: string[];
  onChange: (hashtags: string[]) => void;
}

export default function HashtagInput({ hashtags, onChange }: HashtagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 獲取所有現有的hashtags（從API）
  useEffect(() => {
    const fetchHashtags = async () => {
      try {
        const response = await fetch('/api/hashtags?q=' + encodeURIComponent(inputValue));
        const data = await response.json();
        if (data.success && data.hashtags) {
          // 過濾掉已經選擇的hashtags
          const filtered = data.hashtags.filter(
            (tag: string) => !hashtags.includes(tag) && tag.includes(inputValue)
          );
          setSuggestions(filtered.slice(0, 10));
        }
      } catch (error) {
        console.error('Error fetching hashtags:', error instanceof Error ? error.message : String(error));
      }
    };

    if (inputValue.trim()) {
      fetchHashtags();
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, hashtags]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 在中文輸入期間不處理 Enter 鍵，避免干擾輸入法
    if (isComposing) return;

    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      e.stopPropagation();

      const tag = inputValue.trim();
      if (!hashtags.includes(tag)) {
        onChange([...hashtags, tag]);

        // 使用 flushSync 確保狀態更新立即生效
        flushSync(() => {
          setInputValue('');
          setShowSuggestions(false);
        });
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleSelectSuggestion = (tag: string) => {
    if (!hashtags.includes(tag)) {
      onChange([...hashtags, tag]);
    }
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(hashtags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Label style={{ color: '#5A5A5A' }} className="whitespace-nowrap">
          標籤
        </Label>
        <div className="relative flex-1 min-h-[36px] flex items-center flex-wrap gap-2">
          {hashtags.map((tag) => (
            <div
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
              style={{
                backgroundColor: 'rgba(141, 112, 81, 0.34)',
                borderColor: '#8D7051',
                borderWidth: '1px',
                borderStyle: 'solid',
                color: '#5A5A5A'
              }}
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="text-gray-400 hover:text-gray-600 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onFocus={() => {
              if (inputValue.trim() && suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={hashtags.length === 0 ? "輸入 hashtag 並按 Enter 新增" : ""}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-gray-500 placeholder:text-gray-400"
            style={{ border: 'none', fontSize: '14px' }}
          />
        </div>
      </div>

      {/* 建議列表 */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white" style={{ left: 0, right: 0 }}>
          <div className="p-1">
            {suggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleSelectSuggestion(tag)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                style={{ color: '#5A5A5A' }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

