import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";

/**
 * POST /api/posts/[id]/bookmark
 * 收藏貼文
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

    // 檢查是否已經收藏
    const { data: existingBookmark } = await supabase
      .from('Bookmark')
      .select('id')
      .eq('userId', userId)
      .eq('postId', postId)
      .maybeSingle();

    if (existingBookmark) {
      return NextResponse.json({
        success: true,
        message: "Already bookmarked",
        bookmarked: true,
      });
    }

    // 建立 Bookmark 記錄
    const { data: bookmark, error: bookmarkError } = await supabase
      .from('Bookmark')
      .insert({
        id: crypto.randomUUID(),
        userId: userId,
        postId: postId,
      } as any)
      .select()
      .single();

    if (bookmarkError) {
      console.error("Error creating bookmark:", bookmarkError);
      return NextResponse.json(
        { error: "Failed to bookmark post" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bookmarked: true,
      bookmark,
    });
  } catch (error: any) {
    console.error("Error bookmarking post:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id]/bookmark
 * 取消收藏
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

    // 刪除 Bookmark 記錄
    const { error: deleteError } = await supabase
      .from('Bookmark')
      .delete()
      .eq('userId', userId)
      .eq('postId', postId);

    if (deleteError) {
      console.error("Error deleting bookmark:", deleteError);
      return NextResponse.json(
        { error: "Failed to unbookmark post" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bookmarked: false,
    });
  } catch (error: any) {
    console.error("Error unbookmarking post:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


