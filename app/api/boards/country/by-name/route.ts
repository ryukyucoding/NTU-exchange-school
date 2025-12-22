import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db";

/**
 * GET /api/boards/country/by-name?name=國家名稱
 * 根據國家名稱查找國家看板
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const countryName = searchParams.get("name");

    if (!countryName) {
      return NextResponse.json(
        { success: false, error: "Country name is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database not configured" },
        { status: 500 }
      );
    }

    // 先查找 Country 表
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: country, error: countryError } = await (supabase as any)
      .from("Country")
      .select("id, country_zh, country_en")
      .or(`country_zh.eq.${countryName},country_en.eq.${countryName}`)
      .maybeSingle();

    if (countryError || !country) {
      return NextResponse.json(
        { success: false, error: "Country not found" },
        { status: 404 }
      );
    }

    // 查找對應的 Board
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: board, error: boardError } = await (supabase as any)
      .from("Board")
      .select("id")
      .eq("type", "country")
      .eq("country_id", country.id)
      .maybeSingle();

    if (boardError || !board) {
      return NextResponse.json(
        { success: false, error: "Board not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      boardId: board.id,
      countryId: country.id,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/boards/country/by-name:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

