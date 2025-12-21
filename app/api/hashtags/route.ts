import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db";

/**
 * GET /api/hashtags?q=xxx
 * 搜尋 hashtag（autocomplete）
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json({
        success: true,
        hashtags: [],
      });
    }

    let hashtagQuery = supabase
      .from('Hashtag')
      .select('content')
      .order('content', { ascending: true })
      .limit(50);

    // 如果有查詢字串，過濾
    if (query.trim()) {
      hashtagQuery = hashtagQuery.ilike('content', `%${query.trim()}%`);
    }

    const { data: hashtags, error } = await hashtagQuery;

    if (error) {
      console.error("Error fetching hashtags:", error);
      return NextResponse.json({
        success: true,
        hashtags: [],
      });
    }

    // 去重並提取唯一值
    const uniqueHashtags = Array.from(
      new Set((hashtags || []).map((h: any) => h.content))
    );

    return NextResponse.json({
      success: true,
      hashtags: uniqueHashtags,
    });
  } catch (error: any) {
    console.error("Error fetching hashtags:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


