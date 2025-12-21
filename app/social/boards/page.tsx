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

function BoardsContent() {
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [countriesByRegion, setCountriesByRegion] = useState<Record<string, string[]>>({
    Americas: [],
    Europe: [],
    Asia: [],
    Africa: [],
    Oceania: [],
  });
  const [loading, setLoading] = useState(true);

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
            (sum: number, countries: any) => sum + (countries?.length || 0),
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
    <div className="min-h-screen" style={{ backgroundColor: 'rgba(244, 244, 244, 1)' }}>
      {/* Header section is handled by AppShell */}
      
      {/* Topic Frame: Title section - same style as posts page */}
      <div className="sticky top-16 z-40 py-4 border-b border-transparent">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center">
            <div 
              className="flex items-center justify-center"
              style={{
                width: '96px',
                height: '32px',
                border: '1px solid #5A5A5A',
                borderRadius: '24px',
                boxSizing: 'border-box'
              }}
            >
              <h1 
                className="text-sm font-semibold"
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
        </div>
      </div>

      {/* Content Frame: Main content area with boards and sidebar */}
      <div className="max-w-7xl mx-auto px-4 pb-6 pt-4">
        <div className="flex gap-6 items-start justify-center">
          {/* Left Sidebar - Empty but keeps layout structure */}
          <aside className="hidden md:block w-64 flex-shrink-0">
            {/* Empty sidebar to maintain three-column layout */}
          </aside>

          {/* Main Content - Boards list (scrollable) */}
          <main className="w-[800px] flex-shrink-0" style={{ maxHeight: 'calc(100vh - 8rem)', overflowY: 'auto' }}>
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
                          countries.map((country, index) => {
                            const countryISO = getCountryISO(country);
                            const countrySlug = encodeURIComponent(country);
                            return (
                              <Link
                                key={`${country}-${index}`}
                                href={`/social/boards/country/${countrySlug}`}
                              >
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-700"
                                >
                                  {countryISO && (
                                    <span className={`fi fi-${countryISO} mr-2`}></span>
                                  )}
                                  {country}
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

          {/* Right Sidebar Frame - Fixed */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky" style={{ top: '6rem' }}>
              <SocialSidebar />
            </div>
          </aside>
        </div>
      </div>
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

