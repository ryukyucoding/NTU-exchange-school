'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { School } from '@/types/school';

const CACHE_KEY = 'schools_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分鐘

interface SchoolContextType {
  schools: School[];
  loading: boolean;
  error: Error | null;
  reloadSchools: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

function readCache(): School[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw) as { data: School[]; timestamp: number };
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeCache(schools: School[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: schools, timestamp: Date.now() }));
  } catch {
    // sessionStorage 滿了或不可用時忽略
  }
}

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reloadSchools = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/schools');
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Prefer details in dev (actual Supabase/server message); otherwise show error or status
        const message = (data?.details || data?.error) ?? `HTTP error! status: ${response.status}`;
        throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
      }

      if (data.success && data.schools) {
        setSchools(data.schools);
        writeCache(data.schools);
      } else {
        throw new Error(data.error || 'Failed to load schools from Supabase');
      }
    } catch (err) {
      console.error('載入學校資料失敗:', err);
      setError(err as Error);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 先從 sessionStorage 讀快取，命中時直接顯示，同時在背景更新
    const cached = readCache();
    if (cached) {
      setSchools(cached);
      setLoading(false);
      // 背景靜默更新（不顯示 loading）
      fetch('/api/schools')
        .then(r => r.json())
        .then(data => {
          if (data.success && data.schools) {
            setSchools(data.schools);
            writeCache(data.schools);
          }
        })
        .catch(() => {/* 背景更新失敗時保留快取資料 */});
    } else {
      reloadSchools();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SchoolContext.Provider value={{ schools, loading, error, reloadSchools }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchoolContext() {
  const context = useContext(SchoolContext);
  if (!context) {
    throw new Error('useSchoolContext must be used within SchoolProvider');
  }
  return context;
}
