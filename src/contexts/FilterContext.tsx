import React, { createContext, useContext, useState } from 'react';
import { FilterState } from '@/types/filter';

interface FilterContextType {
  filters: FilterState;
  updateFilters: (updates: Partial<FilterState>) => void;
  resetFilters: () => void;
}

const defaultFilters: FilterState = {
  regions: [],
  countries: [],
  colleges: [],
  gradeRequirement: null,
  gpaMin: null,
  toeflMin: null,
  ieltsMin: null,
  toeicMin: null,
  quotaMin: null,
  semesters: [],
  searchKeyword: '',
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const updateFilters = (updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
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