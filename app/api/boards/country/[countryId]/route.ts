import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db";

/**
 * GET /api/boards/country/[countryId]
 * 回傳國家看板資訊 + 追蹤數/貼文數
 *
 * countryId 是 Country.id (number，從 URL 參數轉換)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ countryId: string }> }
) {
  try {
    const { countryId } = await params;
    
    // 將 countryId 轉換為數字（因為 Country.id 和 Board.country_id 都是 number 類型）
    const countryIdNum = parseInt(countryId, 10);
    if (isNaN(countryIdNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid country ID" },
        { status: 400 }
      );
    }

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
          name: null,
          country_id: countryIdNum,
        },
        stats: {
          followerCount: 0,
          postCount: 0,
        },
        country: null,
      });
    }

    // 直接查詢 Board 表（所有國家板都已存在）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const boardQuery = (supabase as any)
      .from("Board")
      .select("id, name, slug, type, country_id, schoolId, description")
      .eq("type", "country")
      .eq("country_id", countryIdNum)
      .maybeSingle();
    const { data: board, error: boardError } = await boardQuery;

    if (boardError) {
      console.error("Error fetching country board:", boardError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch board" },
        { status: 500 }
      );
    }

    if (!board || !board.id) {
      return NextResponse.json(
        { success: false, error: "Board not found" },
        { status: 404 }
      );
    }

    const boardId = board.id;

    // 並行查詢國家資訊和統計數據
    const [{ data: countryInfo }, { count: followerCount }, { count: postCount }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((supabase as any).from("Country")
        .select("id, country_zh, country_en, continent")
        .eq("id", countryIdNum)
        .maybeSingle()),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((supabase as any).from("BoardFollow")
        .select("*", { count: "exact", head: true })
        .eq("boardId", boardId)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((supabase as any).from("PostBoard")
        .select("*", { count: "exact", head: true })
        .eq("boardId", boardId)),
    ]);

    return NextResponse.json({
      success: true,
      board,
      stats: {
        followerCount: followerCount || 0,
        postCount: postCount || 0,
      },
      country: countryInfo,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/boards/country/[countryId]:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}


