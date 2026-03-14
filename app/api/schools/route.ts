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

    // 並行查詢 schools 和 Country 表，減少一個 DB round-trip
    const [schoolsResult, countriesResult] = await Promise.all([
      supabase
        .from("schools")
        // 用 * 避免「某欄在舊表不存在」整支 API 500；缺欄在前端以 ?? / || 補預設
        .select("*")
        .order("name_zh"),
      supabase
        .from("Country")
        .select("id, country_zh, country_en, continent"),
    ]);

    const { data: schools, error } = schoolsResult;
    const { data: countries, error: countriesError } = countriesResult;

    if (error) {
      console.error("Error fetching schools from Supabase:", error.message);
      return NextResponse.json(
        {
          success: false,
          error: '伺服器錯誤，請稍後再試',
          details: error.message,
        },
        { status: 500 }
      );
    }

    if (countriesError) {
      console.error("Error fetching countries:", countriesError.message);
    }

    // 創建國家 ID 到國家信息的映射
    const countryMap = new Map<string, { id: number; country_zh: string; country_en: string; continent: string }>();
    if (countries) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (countries as any[]).forEach((c: { id: number; country_zh: string; country_en: string; continent: string }) => {
        countryMap.set(String(c.id), c);
      });
    }

    // 轉換資料格式以符合前端 School 類型
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedSchools = ((schools || []) as any[]).map((school: Record<string, unknown> & {
      id: number;
      name_zh?: string | null;
      name_en?: string | null;
      country_id?: number | null;
    }) => {
      const rawCountryId = school.country_id;
      const countryIdStr = (rawCountryId !== null && rawCountryId !== undefined) ? String(rawCountryId) : null;
      const countryInfo = countryIdStr ? countryMap.get(countryIdStr) : null;
      
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
      const langText = String(school.language_requirement ?? '');
      const languageInfo = parseLanguageRequirement(langText);

      // 解析 GPA
      const gpaText = String(school.gpa_requirement ?? '');
      const gpa_min = parseGpaRequirement(gpaText);

      // 解析學期
      const semesters = parseSemesters(String(school.academic_calendar ?? ''));

      return {
        id: String(school.id), // 確保 id 是字符串（因為數據庫中是 bigint）
        name_zh: String(school.name_zh ?? ''),
        name_en: String(school.name_en ?? ''),
        country: country,
        country_en: country_en,
        country_id: countryIdStr, // 使用上面處理過的 countryIdStr
        url: String(school.url ?? ''),
        second_exchange_eligible: Boolean(school.second_exchange_eligible),
        application_group: String(school.application_group ?? ''),
        gpa_requirement: String(school.gpa_requirement ?? ''),
        grade_requirement: String(school.grade_requirement ?? ''),
        language_requirement: String(school.language_requirement ?? ''),
        restricted_colleges: String(school.restricted_colleges ?? ''),
        quota: String(school.quota ?? ''),
        academic_calendar: String(school.academic_calendar ?? ''),
        registration_fee: String(school.registration_fee ?? ''),
        accommodation_info: String(school.accommodation_info ?? ''),
        notes: String(school.notes ?? ''),
        latitude:
          school.latitude != null && school.latitude !== ''
            ? parseFloat(String(school.latitude))
            : 0,
        longitude:
          school.longitude != null && school.longitude !== ''
            ? parseFloat(String(school.longitude))
            : 0,
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

    // 學校資料極少異動，快取 5 分鐘（edge）/ 1 分鐘（瀏覽器），背景自動更新
    return NextResponse.json(
      { success: true, schools: formattedSchools },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, max-age=60, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error in GET /api/schools:", error);
    const isDev = process.env.NODE_ENV === 'development';
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: "伺服器錯誤，請稍後再試",
        ...(isDev && { details }),
      },
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

