import Papa from 'papaparse';
import { School } from '@/types/school';
import { getRegionByCountry } from './regions';

// 解析 GPA 要求文字，提取數值
function parseGpaRequirement(gpaText: string): number | null {
  if (!gpaText || gpaText === '無') return null;
  
  // 匹配 "GPA 達3.00分以上" 或 "學士生 GPA 達2.70分以上；研究生 GPA 達3.00分以上"
  const match = gpaText.match(/GPA\s*達\s*(\d+\.?\d*)\s*分以上/);
  if (match) {
    return parseFloat(match[1]);
  }
  
  // 匹配 "GPA 達3.20分以上"
  const match2 = gpaText.match(/GPA\s*達\s*(\d+\.?\d*)\s*分以上/);
  if (match2) {
    return parseFloat(match2[1]);
  }
  
  return null;
}

// 解析語言要求，提取 TOEFL、IELTS 和 TOEIC 分數
function parseLanguageRequirement(langText: string): {
  toefl_ibt: number | null;
  ielts: number | null;
  toeic: number | null;
  other_language: string | null;
} {
  if (!langText) return { toefl_ibt: null, ielts: null, toeic: null, other_language: null };
  
  let toefl_ibt: number | null = null;
  let ielts: number | null = null;
  let toeic: number | null = null;
  let other_language: string | null = null;
  
  // 提取 TOEFL iBT 分數
  const toeflMatch = langText.match(/TOEFL\s*iBT\s*(\d+)/);
  if (toeflMatch) {
    toefl_ibt = parseInt(toeflMatch[1]);
  }
  
  // 提取 IELTS 分數
  const ieltsMatch = langText.match(/IELTS\s*(\d+\.?\d*)/);
  if (ieltsMatch) {
    ielts = parseFloat(ieltsMatch[1]);
  }
  
  // 提取 TOEIC 分數
  const toeicMatch = langText.match(/TOEIC\s*(\d+)/);
  if (toeicMatch) {
    toeic = parseInt(toeicMatch[1]);
  }
  
  // 檢查是否有其他語言要求
  if (langText.includes('法語') || langText.includes('德語') || langText.includes('西班牙語') || 
      langText.includes('西語') || langText.includes('日語') || langText.includes('韓語') || 
      langText.includes('葡萄牙語') || langText.includes('DELE') || langText.includes('SIELE')) {
    other_language = langText;
  }
  
  return { toefl_ibt, ielts, toeic, other_language };
}

// 解析學期資訊
function parseSemesters(calendarText: string): ('Fall' | 'Spring')[] {
  if (!calendarText) return ['Fall', 'Spring'];
  
  const semesters: ('Fall' | 'Spring')[] = [];
  if (calendarText.includes('Fall') || calendarText.includes('September') || calendarText.includes('第一學期')) {
    semesters.push('Fall');
  }
  if (calendarText.includes('Spring') || calendarText.includes('Winter') || calendarText.includes('第二學期')) {
    semesters.push('Spring');
  }
  
  return semesters.length > 0 ? semesters : ['Fall', 'Spring'];
}

// 解析地區
function parseRegion(country: string): 'Americas' | 'Europe' | 'Asia' | 'Oceania' | 'Africa' {
  const region = getRegionByCountry(country);
  if (region) {
    return region as 'Americas' | 'Europe' | 'Asia' | 'Oceania' | 'Africa';
  }
  
  // 如果找不到對應的地區，預設為亞洲（避免 Other 類別）
  return 'Asia';
}

export async function loadSchools(): Promise<School[]> {
  try {
    const response = await fetch('/data/school_map.csv');
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const schools = results.data.map((row: any, index: number) => {
            const languageInfo = parseLanguageRequirement(row.語言要求 || '');
            
            return {
              id: row.id || `school-${index}`,
              name_zh: row.name_zh || '',
              name_en: row.name_en || '',
              country: row.country || '',
              country_en: row.country_en || '',
              url: row.url || '',
              second_exchange_eligible: row.開放第二次出國交換之同學選填 === '是',
              application_group: row.申請組別 || '',
              gpa_requirement: row.GPA要求 || '',
              grade_requirement: row.年級限制 || '',
              language_requirement: row.語言要求 || '',
              restricted_colleges: row.不接受申請之學院 || '',
              quota: row.名額 || '',
              academic_calendar: row.學校年曆 || '',
              registration_fee: row.註冊繳費 || '',
              accommodation_info: row.住宿資訊 || '',
              notes: row.注意事項 || '',
              latitude: parseFloat(row.latitude) || 0,
              longitude: parseFloat(row.longitude) || 0,
              // 解析後的欄位
              region: parseRegion(row.country || ''),
              gpa_min: parseGpaRequirement(row.GPA要求 || ''),
              toefl_ibt: languageInfo.toefl_ibt,
              ielts: languageInfo.ielts,
              toeic: languageInfo.toeic,
              other_language: languageInfo.other_language,
              semesters: parseSemesters(row.學校年曆 || ''),
              tuition: null, // 需要從其他欄位推斷
            } as School;
          });
          resolve(schools);
        },
        error: (error: Error) => {
          reject(error);
        },
      });
    });
  } catch (error) {
    console.error('Error loading schools:', error);
    throw error;
  }
}
