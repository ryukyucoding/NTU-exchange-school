'use client';

import React, { useState, useMemo } from 'react';
import { Search, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFilters } from '@/contexts/FilterContext';
import { useSchoolContext } from '@/contexts/SchoolContext';
import { usePanelManager } from '@/hooks/usePanelManager';
import { useMapBackgroundBrightness } from '@/hooks/useBackgroundBrightness';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingSearchBarProps {
  schoolCount: number;
  variant?: 'glass' | 'wishlist';
}

export default function FloatingSearchBar({ schoolCount, variant = 'glass' }: FloatingSearchBarProps) {
  const { filters, updateFilters } = useFilters();
  const { schools } = useSchoolContext();
  const [searchTerm, setSearchTerm] = useState(filters.searchKeyword || '');
  const panelManager = usePanelManager();
  const { panels, togglePanel, collapsePanel } = panelManager;
  const isHighZoom = useMapBackgroundBrightness(3);

  const handleSearch = () => {
    updateFilters({ searchKeyword: searchTerm });
  };

  const clearSearch = () => {
    setSearchTerm('');
    updateFilters({ searchKeyword: '' });
  };

  const handleRegionFilter = () => {
    togglePanel('search');
  };

  // 防止搜尋欄內部點擊事件冒泡
  const handleSearchBarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // 依地區分組的國家列表（從學校資料動態產生）
  const regionToCountries = useMemo(() => {
    const map = new Map<string, Set<string>>();
    schools.forEach(s => {
      if (s.country && s.region) {
        if (!map.has(s.region)) map.set(s.region, new Set());
        map.get(s.region)!.add(s.country);
      }
    });
    const result = new Map<string, string[]>();
    for (const [region, set] of map) {
      result.set(region, Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant')));
    }
    return result;
  }, [schools]);

  const regions = ['Asia', 'Europe', 'Americas', 'Oceania', 'Africa'] as const;
  const regionLabels: Record<string, string> = {
    Asia: '亞洲', Europe: '歐洲', Americas: '美洲', Oceania: '大洋洲', Africa: '非洲',
  };

  const getRegionState = (region: string): 'all' | 'some' | 'none' => {
    const countries = regionToCountries.get(region) || [];
    if (countries.length === 0) return 'none';
    const selected = countries.filter(c => filters.countries?.includes(c));
    if (selected.length === 0) return 'none';
    if (selected.length === countries.length) return 'all';
    return 'some';
  };

  const toggleRegionCountries = (region: string) => {
    const countriesInRegion = regionToCountries.get(region) || [];
    const state = getRegionState(region);
    let newCountries: string[];
    if (state === 'all') {
      // 全選 → 全部取消
      newCountries = (filters.countries || []).filter(c => !countriesInRegion.includes(c));
    } else {
      // none 或 some → 全選
      const existing = new Set(filters.countries || []);
      countriesInRegion.forEach(c => existing.add(c));
      newCountries = Array.from(existing);
    }
    updateFilters({ countries: newCountries });
  };

  const toggleCountry = (country: string) => {
    const newCountries = filters.countries?.includes(country)
      ? filters.countries.filter(c => c !== country)
      : [...(filters.countries || []), country];
    updateFilters({ countries: newCountries });
  };

  const clearFilters = () => {
    setSearchTerm('');
    updateFilters({ searchKeyword: '', regions: [], countries: [] });
  };

  return (
    <>
      {/* 背景模糊遮罩 - 只有篩選面板展開時顯示 */}
      <AnimatePresence>
        {panels.search.isExpanded && (
          <>
            {/* 模糊背景層 */}
            <motion.div
              className={
                variant === 'wishlist'
                  ? 'fixed inset-0 bg-[#4a3828]/10 backdrop-blur-md z-40 pointer-events-none'
                  : 'fixed inset-0 bg-black/40 backdrop-blur-md z-40 pointer-events-none'
              }
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
            {/* 可點擊層 */}
            <motion.div
              className="fixed inset-0 z-40 pointer-events-auto"
              onClick={() => collapsePanel('search')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{
                background: 'transparent'
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* 搜尋欄 - 始終可見 */}
      <div
        className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto"
        onClick={handleSearchBarClick}
        data-tour-step="search"
      >
        <div
          className={
            variant === 'wishlist'
              ? 'bg-white border border-[#d6c3a1] rounded-xl shadow-sm p-4 min-w-[600px]'
              : `backdrop-blur-md rounded-lg shadow-2xl p-4 min-w-[600px] transition-all duration-300 ${
                  isHighZoom ? 'bg-white/30' : 'bg-white/10'
                }`
          }
          style={
            variant === 'wishlist'
              ? undefined
              : {
                  border: isHighZoom
                    ? '1px solid rgba(255, 255, 255, 0.35)'
                    : '1px solid rgba(255, 255, 255, 0.20)',
                }
          }
        >
        <div className={`flex items-center gap-4 ${
          variant === 'wishlist' ? 'text-[#4a3828]' : (isHighZoom ? 'text-gray-800' : 'text-white')
        }`}>
          {/* 搜尋輸入框 */}
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                  variant === 'wishlist'
                    ? 'text-[#6b5b4c]'
                    : isHighZoom
                      ? 'text-gray-700'
                      : 'text-white/90'
                }`}
              />
              <Input
                placeholder="搜尋學校名稱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={
                  variant === 'wishlist'
                    ? 'pl-10 bg-white border-[#d6c3a1] text-[#4a3828] placeholder:text-[#8a7a63] focus-visible:ring-[#d6c3a1]'
                    : `pl-10 backdrop-blur-sm transition-all duration-300 ${
                        isHighZoom
                          ? 'bg-white/20 border-white/30 text-gray-800 placeholder:text-gray-600'
                          : 'bg-white/10 border-white/20 text-white placeholder:text-white/50'
                      }`
                }
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={
                    variant === 'wishlist'
                      ? 'absolute right-2 top-1/2 transform -translate-y-1/2 text-[#6b5b4c] hover:text-[#4a3828] hover:bg-[#f5ede1]'
                      : `absolute right-2 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${
                          isHighZoom
                            ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                            : 'text-white/70 hover:text-white hover:bg-white/20'
                        }`
                  }
                  onClick={clearSearch}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            <Button
              onClick={handleRegionFilter}
              className={
                variant === 'wishlist'
                  ? `transition-all duration-200 ${
                      panels.search.isExpanded
                        ? 'bg-[#d6c3a1] text-[#3b2a1c] hover:bg-[#c5b28f] hover:text-[#3b2a1c]'
                        : 'bg-white border border-[#d6c3a1] text-[#4a3828] hover:bg-[#f5ede1] hover:text-[#4a3828]'
                    }`
                  : `transition-all duration-300 ${
                      panels.search.isExpanded
                        ? 'bg-blue-500/80 hover:bg-blue-500 text-white shadow-lg backdrop-blur-sm'
                        : isHighZoom
                          ? 'bg-white/20 hover:bg-white/30 text-gray-800 border-white/30 backdrop-blur-sm'
                          : 'bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm'
                    }`
              }
            >
              <MapPin className="w-4 h-4" />
            </Button>
          </div>

          {/* 學校數量顯示 */}
          <div className={`text-sm drop-shadow-lg whitespace-nowrap transition-all duration-300 ${
            variant === 'wishlist' ? 'text-[#6b5b4c]' : (isHighZoom ? 'text-gray-800' : 'text-white')
          }`}>
            找到{' '}
            <span className={`font-bold drop-shadow-md ${
              variant === 'wishlist' ? 'text-[#a07a52]' : (isHighZoom ? 'text-blue-600' : 'text-blue-300')
            }`}>{schoolCount}</span>{' '}
            間學校
          </div>
        </div>

        {/* 地區篩選展開面板 */}
        <AnimatePresence>
          {panels.search.isExpanded && (
            <motion.div 
              className={
                variant === 'wishlist'
                  ? 'mt-4 pt-4 border-t border-[#d6c3a1]'
                  : `mt-4 pt-4 border-t transition-all duration-300 ${
                      isHighZoom ? 'border-gray-300' : 'border-white/20'
                    }`
              }
              initial={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16, paddingTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="space-y-3">
              {/* 地區 / 國家篩選 - 雙欄佈局 */}
              <label className={`text-xs mb-2 block drop-shadow-md transition-all duration-300 ${
                variant === 'wishlist' ? 'text-[#6b5b4c]' : (isHighZoom ? 'text-gray-700' : 'text-white/70')
              }`}>地區 / 國家篩選</label>
              <div className="max-h-64 overflow-y-auto" style={{ display: 'grid', gridTemplateColumns: 'auto 12px 1px 12px 1fr', gap: 0 }}>
                {regions.map((region, idx) => {
                  const countries = regionToCountries.get(region) || [];
                  if (countries.length === 0) return null;
                  const state = getRegionState(region);
                  const isLast = idx === regions.length - 1 || regions.slice(idx + 1).every(r => (regionToCountries.get(r) || []).length === 0);
                  return (
                    <React.Fragment key={region}>
                      {/* 左：地區按鈕 */}
                      <div className={`flex items-start justify-center ${isLast ? '' : 'pb-3'}`}>
                        <Button
                          variant={state !== 'none' ? 'default' : 'outline'}
                          size="sm"
                          className={
                            variant === 'wishlist'
                              ? `text-xs h-7 w-12 border transition-all duration-200 ${
                                  state === 'all'
                                    ? 'bg-[#d6c3a1] border-[#d6c3a1] text-[#3b2a1c] hover:bg-[#c5b28f] hover:text-[#3b2a1c]'
                                    : state === 'some'
                                      ? 'bg-[#e8ddc8] border-[#d6c3a1] text-[#3b2a1c] hover:bg-[#ddd0b8] hover:text-[#3b2a1c]'
                                      : 'bg-white border-[#d6c3a1] text-[#4a3828] hover:bg-[#f5ede1] hover:text-[#4a3828]'
                                }`
                              : `text-xs h-7 w-12 border transition-all duration-300 ${
                                  state === 'all'
                                    ? 'bg-blue-500/80 border-transparent hover:bg-blue-500 text-white shadow-lg'
                                    : state === 'some'
                                      ? 'bg-blue-400/40 border-blue-300/50 hover:bg-blue-400/60 text-white backdrop-blur-sm'
                                      : isHighZoom
                                        ? 'bg-white/20 border-white/30 hover:bg-white/30 text-gray-800 backdrop-blur-sm'
                                        : 'bg-white/10 border-white/20 hover:bg-white/20 text-white backdrop-blur-sm'
                                }`
                          }
                          onClick={() => toggleRegionCountries(region)}
                        >
                          {regionLabels[region]}
                        </Button>
                      </div>

                      {/* 左間距 */}
                      <div className={isLast ? '' : 'pb-3'} />
                      {/* 分隔線 */}
                      <div className={`${isLast ? '' : 'pb-3'} ${
                        variant === 'wishlist' ? 'bg-[#d6c3a1]' : (isHighZoom ? 'bg-gray-300' : 'bg-white/20')
                      }`} />
                      {/* 右間距 */}
                      <div className={isLast ? '' : 'pb-3'} />

                      {/* 右：國家按鈕 */}
                      <div className={`flex flex-wrap gap-1.5 items-start ${isLast ? '' : 'pb-3'}`}>
                        {countries.map(country => (
                          <Button
                            key={country}
                            variant={filters.countries?.includes(country) ? 'default' : 'outline'}
                            size="sm"
                            className={
                              variant === 'wishlist'
                                ? `text-xs h-7 px-2 border transition-all duration-200 ${
                                    filters.countries?.includes(country)
                                      ? 'bg-[#d6c3a1] border-[#d6c3a1] text-[#3b2a1c] hover:bg-[#c5b28f] hover:text-[#3b2a1c]'
                                      : 'bg-white border-[#d6c3a1] text-[#4a3828] hover:bg-[#f5ede1] hover:text-[#4a3828]'
                                  }`
                                : `text-xs h-7 px-2 border transition-all duration-300 ${
                                    filters.countries?.includes(country)
                                      ? 'bg-blue-500/80 border-transparent hover:bg-blue-500 text-white shadow-lg'
                                      : isHighZoom
                                        ? 'bg-white/20 border-white/30 hover:bg-white/30 text-gray-800 backdrop-blur-sm'
                                        : 'bg-white/10 border-white/20 hover:bg-white/20 text-white backdrop-blur-sm'
                                  }`
                            }
                            onClick={() => toggleCountry(country)}
                          >
                            {country}
                          </Button>
                        ))}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* 清除篩選按鈕 */}
              {(filters.searchKeyword || (filters.countries && filters.countries.length > 0)) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className={
                    variant === 'wishlist'
                      ? 'w-full bg-white border border-[#a07a52] text-[#4a3828] hover:bg-[#f5ede1] hover:text-[#4a3828]'
                      : `w-full backdrop-blur-sm transition-all duration-300 ${
                          isHighZoom
                            ? 'bg-white/20 hover:bg-white/30 text-gray-800 border-white/30'
                            : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                        }`
                  }
                >
                  清除地區篩選
                </Button>
              )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </>
  );
}
