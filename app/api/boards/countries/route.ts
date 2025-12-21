import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db";

// 將資料庫中的 continent 值映射到我們使用的 region 值
const continentToRegion: Record<string, string> = {
  'Americas': 'Americas',
  'Europe': 'Europe',
  'Asia': 'Asia',
  'Africa': 'Africa',
  'Oceania': 'Oceania',
};

/**
 * GET /api/boards/countries
 * 從 country 表獲取所有國家列表，按地區（continent）分組
 */
export async function GET(_req: NextRequest) {
  try {
    let supabase;
    try {
      supabase = getSupabaseServer();
    } catch (error: unknown) {
      console.error("Error creating Supabase client:", error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to connect to database",
        countriesByRegion: {
          Americas: [],
          Europe: [],
          Asia: [],
          Africa: [],
          Oceania: [],
        },
      });
    }

    if (!supabase) {
      console.warn("Supabase client is null");
      return NextResponse.json({
        success: false,
        error: "Supabase client is null",
        countriesByRegion: {
          Americas: [],
          Europe: [],
          Asia: [],
          Africa: [],
          Oceania: [],
        },
      });
    }

    // 從 Country 表查詢所有國家（注意：表名是大寫 C）
    const { data: countries, error } = await supabase
      .from('Country')
      .select('id, country_zh, country_en, continent')
      .order('country_zh');

    if (error) {
      console.error("Error fetching countries from country table:", error);
      return NextResponse.json({
        success: false,
        error: error.message || "Failed to fetch countries",
        countriesByRegion: {
          Americas: [],
          Europe: [],
          Asia: [],
          Africa: [],
          Oceania: [],
        },
      });
    }

    console.log(`Fetched ${countries?.length || 0} countries from country table`);

    // 按地區分組（使用資料庫中的 continent 欄位）
    // 返回格式：{ region: [{ id, country_zh, country_en }] }
    const countriesByRegion: Record<string, Array<{ id: string; country_zh: string; country_en: string }>> = {
      Americas: [],
      Europe: [],
      Asia: [],
      Africa: [],
      Oceania: [],
    };

    (countries as { id: string; country_zh: string; country_en: string; continent: string }[] | null)?.forEach((country) => {
      const continent = country.continent;
      const countryName = country.country_zh || country.country_en;
      
      if (continent && continentToRegion[continent] && countryName && country.id) {
        const region = continentToRegion[continent];
        if (countriesByRegion[region]) {
          countriesByRegion[region].push({
            id: country.id,
            country_zh: country.country_zh,
            country_en: country.country_en,
          });
        }
      }
    });

    // 對每個地區的國家進行排序
    Object.keys(countriesByRegion).forEach((region) => {
      countriesByRegion[region].sort();
      console.log(`${region}: ${countriesByRegion[region].length} countries`);
    });

    return NextResponse.json({
      success: true,
      countriesByRegion,
    });
  } catch (error: unknown) {
    console.error("Unexpected error in GET /api/boards/countries:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
      countriesByRegion: {
        Americas: [],
        Europe: [],
        Asia: [],
        Africa: [],
        Oceania: [],
      },
    });
  }
}

