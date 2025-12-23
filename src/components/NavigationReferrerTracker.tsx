'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Tracks the previous in-app URL in sessionStorage so pages can reliably "go back"
 * even when document.referrer is empty (SPA navigation).
 *
 * Stored keys:
 * - lastUrl: previous URL (pathname + search)
 * - postPageReferrer: kept for backward compatibility with existing post editor logic
 */
export default function NavigationReferrerTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const search = searchParams?.toString() || '';
    const currentUrl = `${pathname}${search ? `?${search}` : ''}`;

    const prevUrl = prevUrlRef.current;
    if (prevUrl) {
      sessionStorage.setItem('lastUrl', prevUrl);
      sessionStorage.setItem('postPageReferrer', prevUrl);
    }

    prevUrlRef.current = currentUrl;
  }, [pathname, searchParams]);

  return null;
}


