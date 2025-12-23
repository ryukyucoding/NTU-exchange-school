import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/posts/[id]/bookmark
 * 收藏貼文
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // 檢查貼文是否存在並獲取作者 ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: post, error: postError } = await (supabase as any)
      .from('Post')
      .select('id, authorId')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // 檢查是否已經收藏
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingBookmark } = await (supabase as any)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bookmark, error: bookmarkError } = await (supabase as any)
      .from('Bookmark')
      .insert({
        id: crypto.randomUUID(),
        userId: userId,
        postId: postId,
      })
      .select()
      .single();

    if (bookmarkError) {
      console.error("Error creating bookmark:", bookmarkError);
      return NextResponse.json(
        { error: "Failed to bookmark post" },
        { status: 500 }
      );
    }

    // 創建通知（通知貼文作者）
    if (post.authorId) {
      await createNotification({
        userId: post.authorId,
        type: 'post_bookmark',
        actorId: userId,
        postId: postId,
      });
    }

    return NextResponse.json({
      success: true,
      bookmarked: true,
      bookmark,
    });
  } catch (error: unknown) {
    console.error("Error bookmarking post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
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
  { params }: { params: Promise<{ id: string }> }
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

    const { id: postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // 刪除 Bookmark 記錄
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
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
  } catch (error: unknown) {
    console.error("Error unbookmarking post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}


