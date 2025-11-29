import { useState } from 'react';
import { useFilters } from '@/contexts/FilterContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

export default function SimpleFilterPanel() {
  const { filters, updateFilters } = useFilters();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    updateFilters({ searchKeyword: searchTerm });
  };

  const clearFilters = () => {
    setSearchTerm('');
    updateFilters({ searchKeyword: '' });
  };

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 transition-all duration-300 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-white/90 hover:bg-white/20 hover:text-white backdrop-blur-sm border border-white/20 transition-all duration-300"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
        </Button>
        <span className="text-white text-sm font-medium drop-shadow-md">篩選條件</span>
      </div>

      {isExpanded && (
        <div className="space-y-3">
          {/* 地區篩選 */}
          <div>
            <label className="text-white/70 text-xs mb-1 block drop-shadow-md">地區</label>
            <div className="flex flex-wrap gap-1">
              {['North America', 'Europe', 'Asia', 'Oceania'].map(region => (
                <Button
                  key={region}
                  variant={filters.regions.includes(region) ? 'default' : 'outline'}
                  size="sm"
                  className={`text-xs transition-all duration-300 ${
                    filters.regions.includes(region) 
                      ? 'bg-blue-500/80 hover:bg-blue-500 text-white shadow-lg' 
                      : 'bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm'
                  }`}
                  onClick={() => {
                    const newRegions = filters.regions.includes(region)
                      ? filters.regions.filter(r => r !== region)
                      : [...filters.regions, region];
                    updateFilters({ regions: newRegions });
                  }}
                >
                  {region === 'North America' ? '北美' :
                   region === 'Europe' ? '歐洲' :
                   region === 'Asia' ? '亞洲' :
                   region === 'Oceania' ? '大洋洲' : region}
                </Button>
              ))}
            </div>
          </div>

          {/* 搜尋 */}
          <div>
            <label className="text-white/70 text-xs mb-1 block drop-shadow-md">搜尋學校</label>
            <div className="flex gap-2">
              <Input
                placeholder="輸入學校名稱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 backdrop-blur-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                size="sm"
                onClick={handleSearch}
                className="bg-blue-500/80 hover:bg-blue-500 text-white shadow-lg backdrop-blur-sm"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* 清除按鈕 */}
          {(filters.regions.length > 0 || filters.searchKeyword) && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm transition-all duration-300"
            >
              清除篩選
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
