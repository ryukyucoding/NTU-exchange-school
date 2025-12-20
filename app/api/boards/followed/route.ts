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

    // 獲取用戶追蹤的看板
    const { data: boardFollows, error: followError } = await supabase
      .from('BoardFollow')
      .select(`
        boardId,
        board:Board!BoardFollow_boardId_fkey (
          id,
          name,
          slug,
          type,
          schoolId,
          country_id
        )
      `)
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (followError) {
      console.error("Error fetching followed boards:", followError);
      return NextResponse.json(
        { error: "Failed to fetch followed boards" },
        { status: 500 }
      );
    }

    // 格式化返回數據
    const boards = (boardFollows || [])
      .map((bf: any) => bf.board)
      .filter(Boolean);

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

