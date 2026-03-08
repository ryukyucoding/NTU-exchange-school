import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";

/**
 * GET /api/boards/followed
 * 獲取當前用戶追蹤的看板列表
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "請先登入" },
        { status: 401 }
      );
    }
    const userId = (session.user as { id: string }).id;

    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json({
        success: true,
        boards: [],
      });
    }

    // 獲取用戶追蹤的看板 ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: boardFollows, error: followError } = await (supabase as any)
      .from('BoardFollow')
      .select('boardId')
      .eq('userId', userId);

    if (followError) {
      console.error("Error fetching followed boards:", followError);
      // 如果是表不存在的錯誤，返回空列表而不是錯誤
      if (followError.code === 'PGRST116' || 
          followError.code === '42P01' ||
          followError.message?.includes('relation') || 
          followError.message?.includes('does not exist')) {
        return NextResponse.json({
          success: true,
          boards: [],
        });
      }
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
    const boardIds = (boardFollows as { boardId: string }[]).map((bf) => bf.boardId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: boards, error: boardsError } = await (supabase as any)
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
  } catch (error: unknown) {
    console.error("Error fetching followed boards:", error);
    return NextResponse.json(
      { error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}

