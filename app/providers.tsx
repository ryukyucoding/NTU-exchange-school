'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { SchoolProvider } from '@/contexts/SchoolContext';
import { FilterProvider } from '@/contexts/FilterContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { UserProvider } from '@/contexts/UserContext';
import { MapZoomProvider } from '@/contexts/MapZoomContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '@/components/ErrorBoundary';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <UserProvider>
          <SchoolProvider>
            <FilterProvider>
              <WishlistProvider>
                <MapZoomProvider>
                  {children}
                  <Toaster position="top-right" />
                </MapZoomProvider>
              </WishlistProvider>
            </FilterProvider>
          </SchoolProvider>
        </UserProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
