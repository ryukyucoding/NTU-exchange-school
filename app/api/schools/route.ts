import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db";

/**
 * GET /api/schools
 * 從 Supabase 獲取所有學校資料
 * 如果 Supabase 未配置，返回空陣列（前端可以 fallback 到 CSV）
 */
export async function GET(_req: NextRequest) {
  try {
    let supabase;
    try {
      supabase = getSupabaseServer();
    } catch (err: unknown) {
      // Supabase 未配置或連接失敗
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error("Supabase not configured:", errorMessage);
      return NextResponse.json(
        {
          success: false,
          error: "Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
          details: errorMessage
        },
        { status: 500 }
      );
    }
    
    if (!supabase) {
      return NextResponse.json(
        { 
          success: false,
          error: "Database connection failed" 
        },
        { status: 500 }
      );
    }

    // 查詢 schools 表
    // 注意：根據 current-database.sql，schools 表沒有 country 和 country_en 欄位
    // 需要通過 country_id JOIN Country 表來獲取國家信息
    // 明確選擇所有欄位，確保 country_id 被包含
    const { data: schools, error } = await supabase
      .from("schools")
      .select("id, name_zh, name_en, country_id, url, second_exchange_eligible, application_group, gpa_requirement, grade_requirement, language_requirement, restricted_colleges, quota, academic_calendar, registration_fee, accommodation_info, notes, latitude, longitude")
      .order("name_zh");

    if (error) {
      console.error("Error fetching schools from Supabase:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      return NextResponse.json(
        { 
          success: false,
          error: "Failed to fetch schools from Supabase", 
          details: error.message,
          code: error.code,
          hint: error.hint 
        },
        { status: 500 }
      );
    }

    // 調試：檢查查詢結果
    if (schools && schools.length > 0) {
      console.log(`[API /schools] 查詢到 ${schools.length} 個學校`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sampleSchool = schools[0] as any;
      if (sampleSchool && 'id' in sampleSchool) {
        console.log(`[API /schools] 樣本學校數據:`, {
          id: sampleSchool.id,
          name_zh: sampleSchool.name_zh,
          country_id: sampleSchool.country_id,
          country_idType: typeof sampleSchool.country_id,
          hasCountryId: 'country_id' in sampleSchool,
        });
      }
    }

    // 獲取所有國家信息（用於後續匹配）
    const { data: countries, error: countriesError } = await supabase
      .from("Country")
      .select("id, country_zh, country_en, continent");

    if (countriesError) {
      console.error("Error fetching countries:", countriesError);
    }

    // 創建國家 ID 到國家信息的映射
    const countryMap = new Map<string, { id: number; country_zh: string; country_en: string; continent: string }>();
    if (countries) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (countries as any[]).forEach((c: { id: number; country_zh: string; country_en: string; continent: string }) => {
        countryMap.set(String(c.id), c);
      });
      console.log(`[API /schools] 載入 ${countries.length} 個國家到映射表`);
    } else {
      console.warn("[API /schools] 沒有獲取到國家數據");
    }

    // 轉換資料格式以符合前端 School 類型
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedSchools = ((schools || []) as any[]).map((school: {
      id: number;
      name_zh: string;
      name_en: string;
      country_id: number | null;
      url: string;
      second_exchange_eligible: boolean;
      application_group: string;
      gpa_requirement: string;
      grade_requirement: string;
      language_requirement: string;
      restricted_colleges: string;
      quota: string;
      academic_calendar: string;
      registration_fee: string;
      accommodation_info: string;
      notes: string;
      latitude: number | null;
      longitude: number | null;
    }) => {
      // 確保 country_id 存在且正確處理
      // 注意：school.country_id 可能是 number 或 null/undefined
      const rawCountryId = school.country_id;
      const countryIdStr = (rawCountryId !== null && rawCountryId !== undefined) ? String(rawCountryId) : null;
      
      // 調試：記錄 country_id 的原始值和轉換後的值
      if (!countryIdStr) {
        console.warn(`[API /schools] 學校 ${school.id} (${school.name_zh}) 的 country_id 為空:`, rawCountryId);
      }
      
      const countryInfo = countryIdStr ? countryMap.get(countryIdStr) : null;
      
      // 調試：記錄沒有匹配到國家的學校
      if (countryIdStr && !countryInfo) {
        console.warn(`[API /schools] 學校 ${school.id} (${school.name_zh}) 的 country_id ${countryIdStr} 沒有匹配到國家`);
      }
      
      const country = countryInfo?.country_zh || '';
      const country_en = countryInfo?.country_en || '';
      const continent = countryInfo?.continent || '';

      // 解析 region（根據 continent 或 country 推斷）
      let region: 'Americas' | 'Europe' | 'Asia' | 'Oceania' | 'Africa' = 'Asia';
      if (continent) {
        if (continent === 'Americas') region = 'Americas';
        else if (continent === 'Europe') region = 'Europe';
        else if (continent === 'Asia') region = 'Asia';
        else if (continent === 'Oceania') region = 'Oceania';
        else if (continent === 'Africa') region = 'Africa';
      } else {
        // Fallback: 根據國家名稱推斷
        if (['美國', '加拿大', '墨西哥', '巴西', '阿根廷', '智利', '哥倫比亞'].some(c => country.includes(c))) {
          region = 'Americas';
        } else if (['英國', '法國', '德國', '義大利', '西班牙', '荷蘭', '瑞士', '瑞典', '挪威', '丹麥', '芬蘭', '比利時', '奧地利', '葡萄牙', '波蘭', '捷克', '匈牙利'].some(c => country.includes(c))) {
          region = 'Europe';
        } else if (['澳洲', '紐西蘭'].some(c => country.includes(c))) {
          region = 'Oceania';
        } else if (['南非', '埃及'].some(c => country.includes(c))) {
          region = 'Africa';
        }
      }

      // 解析語言要求
      const langText = school.language_requirement || '';
      const languageInfo = parseLanguageRequirement(langText);

      // 解析 GPA
      const gpaText = school.gpa_requirement || '';
      const gpa_min = parseGpaRequirement(gpaText);

      // 解析學期
      const semesters = parseSemesters(school.academic_calendar || '');

      return {
        id: String(school.id), // 確保 id 是字符串（因為數據庫中是 bigint）
        name_zh: school.name_zh || '',
        name_en: school.name_en || '',
        country: country,
        country_en: country_en,
        country_id: countryIdStr, // 使用上面處理過的 countryIdStr
        url: school.url || '',
        second_exchange_eligible: school.second_exchange_eligible || false,
        application_group: school.application_group || '',
        gpa_requirement: school.gpa_requirement || '',
        grade_requirement: school.grade_requirement || '',
        language_requirement: school.language_requirement || '',
        restricted_colleges: school.restricted_colleges || '',
        quota: school.quota || '',
        academic_calendar: school.academic_calendar || '',
        registration_fee: school.registration_fee || '',
        accommodation_info: school.accommodation_info || '',
        notes: school.notes || '',
        latitude: school.latitude ? parseFloat(school.latitude.toString()) : 0,
        longitude: school.longitude ? parseFloat(school.longitude.toString()) : 0,
        region,
        gpa_min,
        toefl_ibt: languageInfo.toefl_ibt,
        ielts: languageInfo.ielts,
        toeic: languageInfo.toeic,
        other_language: languageInfo.other_language,
        semesters,
        tuition: null,
      };
    });

    // 統計有 country_id 的學校數量
    const schoolsWithCountryId = formattedSchools.filter(s => s.country_id != null).length;
    console.log(`[API /schools] 返回 ${formattedSchools.length} 個學校，其中 ${schoolsWithCountryId} 個有 country_id`);
    
    // 調試：檢查前幾個學校的 country_id
    if (formattedSchools.length > 0) {
      console.log(`[API /schools] 前3個學校的 country_id:`);
      formattedSchools.slice(0, 3).forEach((s, idx) => {
        console.log(`  ${idx + 1}. ${s.name_zh}: country_id = ${s.country_id} (${typeof s.country_id})`);
      });
    }

    return NextResponse.json({
      success: true,
      schools: formattedSchools,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/schools:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// 解析 GPA 要求
function parseGpaRequirement(gpaText: string): number | null {
  if (!gpaText || gpaText === '無') return null;
  const match = gpaText.match(/GPA\s*達\s*(\d+\.?\d*)\s*分以上/);
  if (match) {
    return parseFloat(match[1]);
  }
  return null;
}

// 解析語言要求
function parseLanguageRequirement(langText: string): {
  toefl_ibt: number | null;
  ielts: number | null;
  toeic: number | null;
  other_language: string | null;
} {
  const result = {
    toefl_ibt: null as number | null,
    ielts: null as number | null,
    toeic: null as number | null,
    other_language: null as string | null,
  };

  if (!langText) return result;

  // TOEFL iBT
  const toeflMatch = langText.match(/TOEFL\s*(?:iBT)?\s*(\d+)/i);
  if (toeflMatch) {
    result.toefl_ibt = parseInt(toeflMatch[1], 10);
  }

  // IELTS
  const ieltsMatch = langText.match(/IELTS\s*(\d+\.?\d*)/i);
  if (ieltsMatch) {
    result.ielts = parseFloat(ieltsMatch[1]);
  }

  // TOEIC
  const toeicMatch = langText.match(/TOEIC\s*(\d+)/i);
  if (toeicMatch) {
    result.toeic = parseInt(toeicMatch[1], 10);
  }

  // 其他語言要求
  if (langText && !toeflMatch && !ieltsMatch && !toeicMatch) {
    result.other_language = langText;
  }

  return result;
}

// 解析學期
function parseSemesters(calendarText: string): string[] {
  if (!calendarText) return [];
  
  const semesters: string[] = [];
  if (calendarText.includes('秋季') || calendarText.includes('Fall') || calendarText.includes('Autumn')) {
    semesters.push('Fall');
  }
  if (calendarText.includes('春季') || calendarText.includes('Spring')) {
    semesters.push('Spring');
  }
  if (calendarText.includes('夏季') || calendarText.includes('Summer')) {
    semesters.push('Summer');
  }
  if (calendarText.includes('冬季') || calendarText.includes('Winter')) {
    semesters.push('Winter');
  }
  
  return semesters.length > 0 ? semesters : ['Fall', 'Spring']; // 預設
}

