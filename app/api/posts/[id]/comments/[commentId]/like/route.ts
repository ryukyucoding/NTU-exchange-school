import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

/**
 * POST /api/posts/[id]/comments/[commentId]/like
 * 對留言按讚
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
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

    const { id: postId, commentId } = await params;

    if (!postId || !commentId) {
      return NextResponse.json(
        { error: "Post ID and Comment ID are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // 檢查留言是否存在且屬於該貼文，並獲取留言作者 ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: comment, error: commentError } = await (supabase as any)
      .from('Comment')
      .select('id, postId, userId')
      .eq('id', commentId)
      .eq('postId', postId)
      .is('deletedAt', null)
      .maybeSingle();

    if (commentError || !comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // 檢查是否已經按讚
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingLike } = await (supabase as any)
      .from('CommentLike')
      .select('id')
      .eq('userId', userId)
      .eq('commentId', commentId)
      .maybeSingle();

    if (existingLike) {
      return NextResponse.json({
        success: true,
        message: "Already liked",
        liked: true,
      });
    }

    // 建立 CommentLike 記錄
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: like, error: likeError } = await (supabase as any)
      .from('CommentLike')
      .insert({
        id: crypto.randomUUID(),
        userId: userId,
        commentId: commentId,
      })
      .select()
      .single();

    if (likeError) {
      console.error("Error creating comment like:", likeError);
      return NextResponse.json(
        { error: "Failed to like comment" },
        { status: 500 }
      );
    }

    // 創建通知（通知留言作者）
    if (comment.userId) {
      await createNotification({
        userId: comment.userId,
        type: 'comment_like',
        actorId: userId,
        postId: postId,
        commentId: commentId,
      });
    }

    return NextResponse.json({
      success: true,
      liked: true,
      like,
    });
  } catch (error: unknown) {
    console.error("Error liking comment:", error);
    return NextResponse.json(
      { error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id]/comments/[commentId]/like
 * 取消按讚
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
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

    const { id: postId, commentId } = await params;

    if (!postId || !commentId) {
      return NextResponse.json(
        { error: "Post ID and Comment ID are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // 刪除 CommentLike 記錄
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('CommentLike')
      .delete()
      .eq('userId', userId)
      .eq('commentId', commentId);

    if (deleteError) {
      console.error("Error deleting comment like:", deleteError);
      return NextResponse.json(
        { error: "Failed to unlike comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      liked: false,
    });
  } catch (error: unknown) {
    console.error("Error unliking comment:", error);
    return NextResponse.json(
      { error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}

