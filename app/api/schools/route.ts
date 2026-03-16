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
        .select("id, name_zh, name_en, country_id, url, second_exchange_eligible, grade_requirement, restricted_colleges, quota, latitude, longitude, gpa_min, toefl_ibt, ielts, toeic, gept, language_cefr, jlpt, no_fail_required, is_updated, sections, language_group, contract_quota, selection_quota, selection_count")
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
      name_zh: string;
      name_en: string;
      country_id: number | null;
      url: string;
      second_exchange_eligible: boolean;
      grade_requirement: string;
      restricted_colleges: string;
      quota: string;
      latitude: number | null;
      longitude: number | null;
      gpa_min: number | null;
      toefl_ibt: number | null;
      ielts: number | null;
      toeic: number | null;
      gept: string | null;
      language_cefr: string | null;
      jlpt: string | null;
      no_fail_required: boolean | null;
      is_updated: boolean | null;
      sections: Array<{ label: string; text: string; links?: Array<{ text: string; href: string }> }> | null;
      language_group: string | null;
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

      return {
        id: String(school.id),
        name_zh: school.name_zh || '',
        name_en: school.name_en || '',
        country: country,
        country_en: country_en,
        country_id: countryIdStr,
        url: school.url || '',
        second_exchange_eligible: school.second_exchange_eligible || false,
        grade_requirement: school.grade_requirement || '',
        restricted_colleges: school.restricted_colleges || '',
        quota: school.quota || '',
        latitude: school.latitude ? parseFloat(school.latitude.toString()) : 0,
        longitude: school.longitude ? parseFloat(school.longitude.toString()) : 0,
        region,
        gpa_min: school.gpa_min ?? null,
        toefl_ibt: school.toefl_ibt ?? null,
        ielts: school.ielts ?? null,
        toeic: school.toeic ?? null,
        other_language: null,
        tuition: null,
        gept: school.gept ?? null,
        language_cefr: school.language_cefr ?? null,
        jlpt: school.jlpt ?? null,
        no_fail_required: school.no_fail_required ?? false,
        is_updated: school.is_updated ?? false,
        sections: school.sections ?? null,
        language_group: school.language_group ?? null,
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


