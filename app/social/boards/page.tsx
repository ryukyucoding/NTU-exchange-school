'use client';

import { useState } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { REGIONS, getCountriesByRegion } from '@/utils/regions';

function BoardsContent() {
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const countriesByRegion = getCountriesByRegion();

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">所有看板</h1>
          <p className="text-muted-foreground">
            選擇地區或國家查看相關貼文
          </p>
        </div>

        <div className="space-y-4">
          {REGIONS.map((region) => {
            const isExpanded = expandedRegions.has(region.value);
            const countries = countriesByRegion[region.value] || [];

            return (
              <Card key={region.value} className="p-4">
                <button
                  onClick={() => toggleRegion(region.value)}
                  className="w-full flex items-center justify-between mb-2 hover:bg-gray-50 p-2 rounded transition-colors"
                >
                  <h2 className="text-xl font-semibold">{region.label}</h2>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {countries
                      .filter((country, index, self) => 
                        // Filter out duplicates (some countries appear in both Chinese and English)
                        self.indexOf(country) === index
                      )
                      .slice(0, 50) // Limit to 50 countries per region for performance
                      .map((country, index) => {
                        // Use the first occurrence (usually Chinese name)
                        const countrySlug = encodeURIComponent(country);
                        return (
                          <Link
                            key={`${country}-${index}`}
                            href={`/social/boards/country/${countrySlug}`}
                          >
                            <Button
                              variant="outline"
                              className="w-full justify-start hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              {country}
                            </Button>
                          </Link>
                        );
                      })}
                  </div>
                )}
              </Card>
            );
          })}
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

