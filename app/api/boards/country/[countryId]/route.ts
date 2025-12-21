import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db";

/**
 * GET /api/boards/country/[countryId]
 * 回傳國家看板資訊 + 追蹤數/貼文數
 *
 * countryId 目前在前端是用 encodeURIComponent(countryName) 直接當 path param
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ countryId: string }> }
) {
  try {
    const { countryId } = await params;
    const decodedCountry = decodeURIComponent(countryId);

    let supabase;
    try {
      supabase = getSupabaseServer();
    } catch {
      supabase = null;
    }

    // Supabase 未配置時，仍回傳可用的最小資料，讓頁面能渲染
    if (!supabase) {
      return NextResponse.json({
        success: true,
        board: {
          id: null,
          type: "country",
          name: decodedCountry,
          country_id: decodedCountry,
        },
        stats: {
          followerCount: 0,
          postCount: 0,
        },
        country: null,
      });
    }

    // 找或建立 Board
    const { data: existingBoard, error: boardFetchError } = await supabase
      .from("Board")
      .select("id,name,slug,type,country_id,schoolId,description")
      .eq("type", "country")
      .eq("country_id", decodedCountry)
      .limit(1)
      .maybeSingle();

    if (boardFetchError) {
      console.error("Error fetching country board:", boardFetchError);
    }

    let board = existingBoard as any;

    if (!board) {
      const newId = crypto.randomUUID();
      const slug = `country-${encodeURIComponent(decodedCountry)}`;
      const { data: created, error: createError } = await supabase
        .from("Board")
        .insert({
          id: newId,
          type: "country",
          name: decodedCountry,
          slug,
          country_id: decodedCountry,
          schoolId: null,
          description: null,
        } as any)
        .select("id,name,slug,type,country_id,schoolId,description")
        .single();

      if (createError) {
        console.error("Error creating country board:", createError);
        board = {
          id: null,
          type: "country",
          name: decodedCountry,
          country_id: decodedCountry,
        };
      } else {
        board = created;
      }
    }

    const boardId = board?.id;

    // 統計：追蹤數、貼文數
    let followerCount = 0;
    let postCount = 0;

    if (boardId) {
      const [{ count: followerExact }, { count: postExact }] = await Promise.all([
        supabase
          .from("BoardFollow")
          .select("*", { count: "exact", head: true })
          .eq("boardId", boardId),
        supabase
          .from("PostBoard")
          .select("*", { count: "exact", head: true })
          .eq("boardId", boardId),
      ]);

      followerCount = followerExact || 0;
      postCount = postExact || 0;
    }

    // Country 資訊（若有）
    let countryInfo: any = null;
    try {
      const { data: byZh } = await supabase
        .from("Country")
        .select("country_zh,country_en,continent")
        .eq("country_zh", decodedCountry)
        .limit(1)
        .maybeSingle();
      countryInfo = byZh;

      if (!countryInfo) {
        const { data: byEn } = await supabase
          .from("Country")
          .select("country_zh,country_en,continent")
          .eq("country_en", decodedCountry)
          .limit(1)
          .maybeSingle();
        countryInfo = byEn;
      }
    } catch (err) {
      console.warn("Error fetching country info:", err);
      countryInfo = null;
    }

    return NextResponse.json({
      success: true,
      board,
      stats: {
        followerCount,
        postCount,
      },
      country: countryInfo,
    });
  } catch (error: any) {
    console.error("Error in GET /api/boards/country/[countryId]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


