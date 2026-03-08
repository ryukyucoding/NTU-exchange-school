'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { SchoolProvider } from '@/contexts/SchoolContext';
import { FilterProvider } from '@/contexts/FilterContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { UserProvider } from '@/contexts/UserContext';
import { MapZoomProvider } from '@/contexts/MapZoomContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from '@/components/ErrorBoundary';
import { PostHogProvider } from '@/components/PostHogProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
    <ErrorBoundary>
      <SessionProvider>
        <UserProvider>
          <SchoolProvider>
            <FilterProvider>
              <WishlistProvider>
                <MapZoomProvider>
                  <NotificationProvider>
                    {children}
                    <Toaster position="top-right" />
                  </NotificationProvider>
                </MapZoomProvider>
              </WishlistProvider>
            </FilterProvider>
          </SchoolProvider>
        </UserProvider>
      </SessionProvider>
    </ErrorBoundary>
    </PostHogProvider>
  );
}
