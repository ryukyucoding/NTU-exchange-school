import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";

/**
 * POST /api/posts/[id]/like
 * 對貼文按讚
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const postId = params.id;

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // 檢查貼文是否存在
    const { data: post, error: postError } = await supabase
      .from('Post')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // 檢查是否已經按讚
    const { data: existingLike } = await supabase
      .from('Like')
      .select('id')
      .eq('userId', userId)
      .eq('postId', postId)
      .maybeSingle();

    if (existingLike) {
      return NextResponse.json({
        success: true,
        message: "Already liked",
        liked: true,
      });
    }

    // 建立 Like 記錄
    const { data: like, error: likeError } = await supabase
      .from('Like')
      .insert({
        id: crypto.randomUUID(),
        userId: userId,
        postId: postId,
      } as any)
      .select()
      .single();

    if (likeError) {
      console.error("Error creating like:", likeError);
      return NextResponse.json(
        { error: "Failed to like post" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      liked: true,
      like,
    });
  } catch (error: any) {
    console.error("Error liking post:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id]/like
 * 取消按讚
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const postId = params.id;

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // 刪除 Like 記錄
    const { error: deleteError } = await supabase
      .from('Like')
      .delete()
      .eq('userId', userId)
      .eq('postId', postId);

    if (deleteError) {
      console.error("Error deleting like:", deleteError);
      return NextResponse.json(
        { error: "Failed to unlike post" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      liked: false,
    });
  } catch (error: any) {
    console.error("Error unliking post:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


