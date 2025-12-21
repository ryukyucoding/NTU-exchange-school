import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";

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
    const userId = (session.user as any).id;
    const { boardId } = await params;

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // 檢查是否已經追蹤
    const { data: existing } = await supabase
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
    const { error } = await supabase.from("BoardFollow").insert({
      userId,
      boardId,
    } as any);

    if (error) {
      console.error("Error following board:", error);
      return NextResponse.json(
        { error: "Failed to follow board" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      isFollowing: true,
    });
  } catch (error: any) {
    console.error("Error in POST /api/boards/[boardId]/follow:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
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
    const userId = (session.user as any).id;
    const { boardId } = await params;

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    const { error } = await supabase
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
  } catch (error: any) {
    console.error("Error in DELETE /api/boards/[boardId]/follow:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
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
    const userId = (session.user as any).id;
    const { boardId } = await params;

    const supabase = getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({
        success: true,
        isFollowing: false,
      });
    }

    const { data } = await supabase
      .from("BoardFollow")
      .select("id")
      .eq("userId", userId)
      .eq("boardId", boardId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      isFollowing: !!data,
    });
  } catch (error: any) {
    console.error("Error in GET /api/boards/[boardId]/follow:", error);
    return NextResponse.json({
      success: true,
      isFollowing: false,
    });
  }
}

