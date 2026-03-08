import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";
import { randomUUID } from "crypto";

/**
 * POST /api/boards/[boardId]/follow
 * 追蹤看板
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "請先登入" },
        { status: 401 }
      );
    }
    const userId = (session.user as { id: string }).id;
    const { boardId } = await params;

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // 檢查看板是否存在
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: boardExists } = await (supabase as any)
      .from("Board")
      .select("id")
      .eq("id", boardId)
      .maybeSingle();

    if (!boardExists) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    // 檢查是否已經追蹤
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("BoardFollow")
      .select("id")
      .eq("userId", userId)
      .eq("boardId", boardId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        isFollowing: true,
      });
    }

    // 建立追蹤關係
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("BoardFollow").insert({
      id: randomUUID(),
      userId,
      boardId,
    });

    if (error) {
      console.error("Error following board:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return NextResponse.json(
        { error: '伺服器錯誤，請稍後再試' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isFollowing: true,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/boards/[boardId]/follow:", error);
    return NextResponse.json(
      { error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/boards/[boardId]/follow
 * 取消追蹤看板
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "請先登入" },
        { status: 401 }
      );
    }
    const userId = (session.user as { id: string }).id;
    const { boardId } = await params;

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("BoardFollow")
      .delete()
      .eq("userId", userId)
      .eq("boardId", boardId);

    if (error) {
      console.error("Error unfollowing board:", error);
      return NextResponse.json(
        { error: "Failed to unfollow board" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isFollowing: false,
    });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/boards/[boardId]/follow:", error);
    return NextResponse.json(
      { error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/boards/[boardId]/follow
 * 檢查是否已追蹤
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({
        success: true,
        isFollowing: false,
      });
    }
    const userId = (session.user as { id: string }).id;
    const { boardId } = await params;

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        isFollowing: false,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("BoardFollow")
      .select("id")
      .eq("userId", userId)
      .eq("boardId", boardId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      isFollowing: !!data,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/boards/[boardId]/follow:", error);
    return NextResponse.json({
      success: true,
      isFollowing: false,
    });
  }
}

