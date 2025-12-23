'use client';

import { useState, useEffect } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { REGIONS } from '@/utils/regions';
import { getCountryISO } from '@/utils/countryFlags';
import SocialSidebar from '@/components/social/SocialSidebar';
import SocialBottomNav from '@/components/social/SocialBottomNav';

function BoardsContent() {
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [countriesByRegion, setCountriesByRegion] = useState<Record<string, Array<{ id: string; country_zh: string; country_en: string }>>>({
    Americas: [],
    Europe: [],
    Asia: [],
    Africa: [],
    Oceania: [],
  });
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('/api/boards/countries');
        const data = await response.json();
        
        console.log('API Response:', data);
        
        if (data.success) {
          setCountriesByRegion(data.countriesByRegion || {});
          // 計算總國家數
          const totalCountries = Object.values(data.countriesByRegion || {}).reduce(
            (sum: number, countries: unknown) => sum + (Array.isArray(countries) ? countries.length : 0),
            0
          );
          console.log(`Loaded ${totalCountries} countries from database`);
        } else {
          console.error('API returned error:', data.error);
        }
      } catch (error) {
        console.error('Error fetching countries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, []);

  const toggleRegion = (region: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) {
        next.delete(region);
      } else {
        next.add(region);
      }
      return next;
    });
  };

  return (
    // AppShell 在 /social/boards 會加 pt-16，所以這裡用 (100vh - 64px) 鎖住整頁高度，避免 body 滾動
    <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col" style={{ backgroundColor: 'rgba(244, 244, 244, 1)' }}>
      {/* Topic Frame - 固定在 header 内部居中 */}
      <div 
        className="fixed top-0 left-0 right-0 z-[51] flex justify-center items-center"
        style={{ 
          height: '64px', // header 的高度
          pointerEvents: 'none' // 让点击事件穿透
        }}
      >
            <div 
          className="flex items-center justify-center pointer-events-auto"
              style={{
                width: 'auto',
                minWidth: '96px',
                paddingLeft: '16px',
                paddingRight: '16px',
                paddingTop: '4px',
                paddingBottom: '4px',
                border: '1px solid #5A5A5A',
                borderRadius: '24px',
            boxSizing: 'border-box',
            backgroundColor: 'transparent',
              }}
            >
              <h1 
                className="text-sm font-semibold whitespace-nowrap"
                style={{ 
                  color: '#5A5A5A',
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontFamily: "'Noto Sans TC', sans-serif"
                }}
              >
                所有看板
              </h1>
        </div>
      </div>

      {/* Content Frame: Main content area with boards and sidebar */}
      <div className="max-w-[1400px] mx-auto px-2 pb-20 pt-4 flex-1 overflow-hidden lg:pb-6">
        <div className="flex gap-6 items-start justify-center h-full">
          {/* Left Sidebar - Empty but keeps layout structure, shrinks on smaller screens */}
          <aside className="hidden md:block md:w-16 lg:w-64 flex-shrink-0">
            {/* Empty sidebar to maintain three-column layout */}
          </aside>

          {/* Main Content - Boards list (ONLY scrollable area), can shrink to keep right sidebar visible */}
          <main className="max-w-[800px] min-w-[500px] w-full md:w-auto lg:w-auto flex-shrink h-full overflow-y-auto overscroll-contain md:mx-0 lg:mx-0 mx-auto">
            <div className="space-y-4">
              {REGIONS.map((region) => {
                const isExpanded = expandedRegions.has(region.value);
                const countries = countriesByRegion[region.value] || [];

                return (
                  <Card key={region.value} className="p-4 bg-white border-0 shadow-none">
                    <button
                      onClick={() => toggleRegion(region.value)}
                      className="w-full flex items-center justify-between mb-2 hover:bg-gray-50 p-2 rounded transition-colors"
                    >
                      <h2 className="text-xl font-semibold text-gray-800">{region.label}</h2>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-800" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-800" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-4 space-y-2">
                        {countries.length === 0 ? (
                          <div className="text-sm text-gray-400 py-2">尚無資料</div>
                        ) : (
                          countries.map((country) => {
                            const countryISO = getCountryISO(country.country_zh);
                            return (
                              <Link
                                key={country.id}
                                href={`/social/boards/country/${country.id}`}
                              >
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-700"
                                >
                                  {countryISO && (
                                    <span className={`fi fi-${countryISO} mr-2`}></span>
                                  )}
                                  {country.country_zh}
                                </Button>
                              </Link>
                            );
                          })
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </main>

          {/* Right Sidebar - Fixed (does NOT scroll), hidden when space is too limited */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
              <SocialSidebar />
          </aside>
        </div>
      </div>

      {/* Bottom Navigation - Only visible on screens smaller than lg */}
      <SocialBottomNav />
    </div>
  );
}

export default function BoardsPage() {
  return (
    <RouteGuard>
      <BoardsContent />
    </RouteGuard>
  );
}


