import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";

/**
 * GET /api/boards/followed
 * 獲取當前用戶追蹤的看板列表
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "請先登入" },
        { status: 401 }
      );
    }
    const userId = (session.user as any).id;

    const supabase = getSupabaseServer();

    // 獲取用戶追蹤的看板 ID
    const { data: boardFollows, error: followError } = await supabase
      .from('BoardFollow')
      .select('boardId')
      .eq('userId', userId);

    if (followError) {
      console.error("Error fetching followed boards:", followError);
      return NextResponse.json(
        { error: "Failed to fetch followed boards" },
        { status: 500 }
      );
    }

    if (!boardFollows || boardFollows.length === 0) {
      return NextResponse.json({
        success: true,
        boards: [],
      });
    }

    // 獲取看板詳細信息
    const boardIds = boardFollows.map((bf: any) => bf.boardId);
    const { data: boards, error: boardsError } = await supabase
      .from('Board')
      .select('id, name, slug, type, schoolId, country_id')
      .in('id', boardIds);

    if (boardsError) {
      console.error("Error fetching board details:", boardsError);
      return NextResponse.json(
        { error: "Failed to fetch board details" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      boards,
    });
  } catch (error: any) {
    console.error("Error fetching followed boards:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

