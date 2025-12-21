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
    } catch (err: any) {
      // Supabase 未配置或連接失敗
      console.error("Supabase not configured:", err.message);
      return NextResponse.json(
        { 
          success: false,
          error: "Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
          details: err.message 
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

    const { data: schools, error } = await supabase
      .from("schools")
      .select("*")
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


    // 轉換資料格式以符合前端 School 類型
    const formattedSchools = (schools || []).map((school: any) => {
      // 解析 region（如果沒有，根據 country 推斷）
      let region: 'Americas' | 'Europe' | 'Asia' | 'Oceania' | 'Africa' = 'Asia';
      const country = school.country || '';
      if (['美國', '加拿大', '墨西哥', '巴西', '阿根廷', '智利', '哥倫比亞'].some(c => country.includes(c))) {
        region = 'Americas';
      } else if (['英國', '法國', '德國', '義大利', '西班牙', '荷蘭', '瑞士', '瑞典', '挪威', '丹麥', '芬蘭', '比利時', '奧地利', '葡萄牙', '波蘭', '捷克', '匈牙利'].some(c => country.includes(c))) {
        region = 'Europe';
      } else if (['澳洲', '紐西蘭'].some(c => country.includes(c))) {
        region = 'Oceania';
      } else if (['南非', '埃及'].some(c => country.includes(c))) {
        region = 'Africa';
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
        id: school.id,
        name_zh: school.name_zh || '',
        name_en: school.name_en || '',
        country: school.country || '',
        country_en: school.country_en || '',
        country_id: school.country_id || null, // 添加 country_id 字段
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

    return NextResponse.json({
      success: true,
      schools: formattedSchools,
    });
  } catch (error: any) {
    console.error("Error in GET /api/schools:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
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

