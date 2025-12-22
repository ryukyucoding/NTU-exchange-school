'use client';

import { useState, useMemo, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface School {
  id: string;
  name_zh: string;
  name_en: string;
  country: string;
}

interface MultiCountrySchoolSelectProps {
  selectedCountries: string[];
  selectedSchoolIds: string[];
  onCountriesChange: (countries: string[]) => void;
  onSchoolIdsChange: (schoolIds: string[]) => void;
  required?: boolean;
  schools: School[];
}

export default function MultiCountrySchoolSelect({
  selectedCountries,
  selectedSchoolIds,
  onCountriesChange,
  onSchoolIdsChange,
  required = false,
  schools,
}: MultiCountrySchoolSelectProps) {
  const [countryInput, setCountryInput] = useState('');
  const [schoolInput, setSchoolInput] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [allCountries, setAllCountries] = useState<string[]>([]);

  // 從 API 獲取所有國家列表
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch('/api/boards/countries');
        const data = await res.json();
        if (data?.success && data.countriesByRegion) {
          // 從所有地區中提取國家名稱
          const countrySet = new Set<string>();
          Object.values(data.countriesByRegion).forEach((regionCountries: any) => {
            if (Array.isArray(regionCountries)) {
              regionCountries.forEach((country: { country_zh: string }) => {
                if (country.country_zh) {
                  countrySet.add(country.country_zh);
                }
              });
            }
          });
          setAllCountries(Array.from(countrySet).sort());
        }
      } catch (err) {
        console.error('Error fetching countries:', err);
        // 如果API失敗，回退到從schools中提取
        const countrySet = new Set<string>();
        schools.forEach(school => {
          if (school.country) countrySet.add(school.country);
        });
        setAllCountries(Array.from(countrySet).sort());
      }
    };
    fetchCountries();
  }, [schools]);

  // 獲取所有國家列表（優先使用API獲取的，否則使用從schools提取的）
  const countries = useMemo(() => {
    if (allCountries.length > 0) {
      return allCountries;
    }
    // 回退：從schools中提取
    const countrySet = new Set<string>();
    schools.forEach(school => {
      if (school.country) countrySet.add(school.country);
    });
    return Array.from(countrySet).sort();
  }, [allCountries, schools]);

  // 根據選擇的國家過濾學校（只顯示所選國家內的學校）
  const filteredSchools = useMemo(() => {
    if (selectedCountries.length === 0) return [];
    return schools
      .filter(school => selectedCountries.includes(school.country))
      .sort((a, b) => a.name_zh.localeCompare(b.name_zh));
  }, [selectedCountries, schools]);

  // 根據輸入過濾國家
  const filteredCountries = useMemo(() => {
    if (!countryInput.trim()) return countries;
    return countries.filter(country => 
      country.toLowerCase().includes(countryInput.trim().toLowerCase())
    );
  }, [countryInput, countries]);

  // 根據輸入過濾學校
  const filteredSchoolsByInput = useMemo(() => {
    if (!schoolInput.trim()) return filteredSchools.slice(0, 10);
    return filteredSchools
      .filter(school => 
        school.name_zh.includes(schoolInput.trim()) || 
        school.name_en.toLowerCase().includes(schoolInput.trim().toLowerCase())
      )
      .slice(0, 10);
  }, [schoolInput, filteredSchools]);

  const handleCountrySelect = (country: string) => {
    if (!selectedCountries.includes(country)) {
      onCountriesChange([...selectedCountries, country]);
    }
    setCountryInput('');
    setShowCountryDropdown(false);
  };

  const handleCountryRemove = (country: string) => {
    // 移除國家時，也要移除不在其他所選國家內的學校
    const remainingCountries = selectedCountries.filter(c => c !== country);
    onCountriesChange(remainingCountries);
    
    // 過濾掉不在剩餘國家內的學校
    const validSchools = selectedSchoolIds.filter(schoolId => {
      const school = schools.find(s => s.id === schoolId);
      return school && remainingCountries.includes(school.country);
    });
    onSchoolIdsChange(validSchools);
  };

  const handleSchoolSelect = (schoolId: string) => {
    if (!selectedSchoolIds.includes(schoolId)) {
      onSchoolIdsChange([...selectedSchoolIds, schoolId]);
    }
    setSchoolInput('');
    setShowSchoolDropdown(false);
  };

  const handleSchoolRemove = (schoolId: string) => {
    onSchoolIdsChange(selectedSchoolIds.filter(id => id !== schoolId));
  };

  return (
    <div className="grid grid-cols-2 gap-4 pb-6" style={{ borderBottom: '1px solid #D9D9D9' }}>
      <div className="relative">
        <div className="flex items-center gap-2">
          <Label htmlFor="country" style={{ color: '#5A5A5A' }} className="whitespace-nowrap">
            國家 {required && <span className="text-red-500">*</span>}
          </Label>
          <div className="relative flex-1 min-h-[36px] flex items-center flex-wrap gap-2">
            {selectedCountries.map((country) => (
              <div 
                key={country}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                style={{
                  backgroundColor: 'rgba(186, 199, 229, 0.45)',
                  borderColor: '#BAC7E569',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: '#5A5A5A'
                }}
              >
                <span>{country}</span>
                <button
                  type="button"
                  onClick={() => handleCountryRemove(country)}
                  className="text-gray-400 hover:text-gray-600 ml-1"
                >
                  ×
                </button>
              </div>
            ))}
            <input
              id="country"
              value={countryInput}
              onChange={(e) => {
                setCountryInput(e.target.value);
                setShowCountryDropdown(true);
              }}
              onFocus={() => setShowCountryDropdown(true)}
              onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
              placeholder={selectedCountries.length === 0 ? "請輸入國家" : ""}
              className="flex-1 min-w-[30px] bg-transparent outline-none text-gray-500 placeholder:text-gray-400"
              style={{ border: 'none', fontSize: '14px' }}
            />
          </div>
        </div>
        {showCountryDropdown && filteredCountries.length > 0 && (
          <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white" style={{ left: 0, right: 0 }}>
            <div className="p-1">
              {filteredCountries.map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  style={{ color: '#5A5A5A' }}
                >
                  {country}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      <div className="relative">
        <div className="flex items-center gap-2">
          <Label htmlFor="school" style={{ color: '#5A5A5A' }} className="whitespace-nowrap">
            學校 {required && <span className="text-red-500">*</span>}
          </Label>
          <div className="relative flex-1 min-h-[36px] flex items-center flex-wrap gap-2">
            {selectedSchoolIds.map((schoolId) => {
              const school = schools.find(s => s.id === schoolId);
              if (!school) return null;
              return (
                <div 
                  key={schoolId}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm"
                  style={{
                    backgroundColor: 'rgba(186, 199, 229, 0.45)',
                    borderColor: '#BAC7E569',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    color: '#5A5A5A'
                  }}
                >
                  <span>{school.name_zh}</span>
                  <button
                    type="button"
                    onClick={() => handleSchoolRemove(schoolId)}
                    className="text-gray-400 hover:text-gray-600 ml-1"
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <input
              id="school"
              value={schoolInput}
              onChange={(e) => {
                setSchoolInput(e.target.value);
                setShowSchoolDropdown(true);
              }}
              onFocus={() => setShowSchoolDropdown(true)}
              onBlur={() => setTimeout(() => setShowSchoolDropdown(false), 200)}
              placeholder={selectedCountries.length === 0 ? "請先選擇國家" : (selectedSchoolIds.length === 0 ? "請輸入學校名稱" : "")}
              className="flex-1 min-w-[30px] bg-transparent outline-none text-gray-500 placeholder:text-gray-400"
              style={{ border: 'none', fontSize: '14px' }}
              disabled={selectedCountries.length === 0}
            />
          </div>
        </div>
        {showSchoolDropdown && filteredSchoolsByInput.length > 0 && selectedCountries.length > 0 && (
          <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white" style={{ left: 0, right: 0 }}>
            <div className="p-1">
              {filteredSchoolsByInput.map((school) => (
                <button
                  key={school.id}
                  type="button"
                  onClick={() => handleSchoolSelect(school.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                  style={{ color: '#5A5A5A' }}
                >
                  {school.name_zh}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
