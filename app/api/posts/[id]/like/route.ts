import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { pushPostUpdate } from "@/lib/pusher";

/**
 * POST /api/posts/[id]/like
 * 對貼文按讚
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

    // 檢查是否已經按讚
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingLike } = await (supabase as any)
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: like, error: likeError } = await (supabase as any)
      .from('Like')
      .insert({
        id: crypto.randomUUID(),
        userId: userId,
        postId: postId,
      })
      .select()
      .single();

    if (likeError) {
      console.error("Error creating like:", likeError);
      return NextResponse.json(
        { error: "Failed to like post" },
        { status: 500 }
      );
    }

    // 創建通知（通知貼文作者）
    if (post.authorId) {
      await createNotification({
        userId: post.authorId,
        type: 'post_like',
        actorId: userId,
        postId: postId,
      });
    }

    // 獲取最新的按讚數量並推送即時更新
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: likeCount } = await (supabase as any)
      .from('Like')
      .select('*', { count: 'exact', head: true })
      .eq('postId', postId);

    await pushPostUpdate(postId, {
      type: 'like',
      likeCount: likeCount || 0,
    });

    return NextResponse.json({
      success: true,
      liked: true,
      like,
      likeCount: likeCount || 0,
    });
  } catch (error: unknown) {
    console.error("Error liking post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
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

    // 刪除 Like 記錄
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
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

    // 獲取最新的按讚數量並推送即時更新
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: likeCount } = await (supabase as any)
      .from('Like')
      .select('*', { count: 'exact', head: true })
      .eq('postId', postId);

    await pushPostUpdate(postId, {
      type: 'unlike',
      likeCount: likeCount || 0,
    });

    return NextResponse.json({
      success: true,
      liked: false,
      likeCount: likeCount || 0,
    });
  } catch (error: unknown) {
    console.error("Error unliking post:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}


