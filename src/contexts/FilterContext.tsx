import React, { createContext, useContext, useState } from 'react';
import { FilterState } from '@/types/filter';
import posthog from 'posthog-js';

interface FilterContextType {
  filters: FilterState;
  updateFilters: (updates: Partial<FilterState>) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  regions: [],
  countries: [],
  colleges: [],
  applicationGroup: null,
  gradeRequirement: null,
  gpaMin: null,
  toeflMin: null,
  ieltsMin: null,
  toeicMin: null,
  quotaMin: null,
  searchKeyword: '',
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const updateFilters = (updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
    posthog.capture('filter_applied', updates as Record<string, unknown>);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    posthog.capture('filter_reset');
  };

  return (
    <FilterContext.Provider value={{ filters, updateFilters, resetFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilters must be used within FilterProvider');
  return context;
}