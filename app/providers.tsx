'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { SchoolProvider } from '@/contexts/SchoolContext';
import { FilterProvider } from '@/contexts/FilterContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { UserProvider } from '@/contexts/UserContext';
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
                {children}
                <Toaster position="top-right" />
              </WishlistProvider>
            </FilterProvider>
          </SchoolProvider>
        </UserProvider>
      </SessionProvider>
    </ErrorBoundary>
  );
}
