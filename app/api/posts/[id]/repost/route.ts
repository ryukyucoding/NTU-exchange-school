import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";

/**
 * POST /api/posts/[id]/repost
 * 轉發貼文
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
    const { data: originalPost, error: postError } = await supabase
      .from('Post')
      .select('id, title, content, authorId')
      .eq('id', postId)
      .single();

    if (postError || !originalPost) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // 檢查是否已經轉發
    const { data: existingRepost } = await supabase
      .from('Repost')
      .select('id')
      .eq('userId', userId)
      .eq('postId', postId)
      .maybeSingle();

    if (existingRepost) {
      return NextResponse.json({
        success: true,
        message: "Already reposted",
        reposted: true,
      });
    }

    // 建立 Repost 記錄
    const { data: repost, error: repostError } = await supabase
      .from('Repost')
      .insert({
        id: crypto.randomUUID(),
        userId: userId,
        postId: postId,
      } as any)
      .select()
      .single();

    if (repostError) {
      console.error("Error creating repost:", repostError);
      return NextResponse.json(
        { error: "Failed to repost" },
        { status: 500 }
      );
    }

    // 可選：建立一個新的 Post 記錄來表示轉發（使用 repostedPostId）
    // 這裡我們只建立 Repost 記錄，不建立新的 Post
    // 如果需要，可以建立一個新的 Post 記錄，將 repostedPostId 設為原始貼文的 ID

    return NextResponse.json({
      success: true,
      reposted: true,
      repost,
    });
  } catch (error: any) {
    console.error("Error reposting:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/posts/[id]/repost
 * 取消轉發
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

    // 刪除 Repost 記錄
    const { error: deleteError } = await supabase
      .from('Repost')
      .delete()
      .eq('userId', userId)
      .eq('postId', postId);

    if (deleteError) {
      console.error("Error deleting repost:", deleteError);
      return NextResponse.json(
        { error: "Failed to undo repost" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reposted: false,
    });
  } catch (error: any) {
    console.error("Error undoing repost:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

