import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";

/**
 * POST /api/posts/[id]/repost
 * 轉發貼文
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

    // 檢查貼文是否存在
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: originalPost, error: postError } = await (supabase as any)
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

    // 檢查是否已經轉發（查找是否有 repostId 指向此貼文的 Post）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingRepost } = await (supabase as any)
      .from('Post')
      .select('id')
      .eq('authorId', userId)
      .eq('repostId', postId)
      .eq('status', 'published')
      .maybeSingle();

    if (existingRepost) {
      return NextResponse.json({
        success: true,
        message: "Already reposted",
        reposted: true,
      });
    }

    // 建立新的 Post 記錄來表示轉發
    const newPostId = crypto.randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: repostPost, error: repostError } = await (supabase as any)
      .from('Post')
      .insert({
        id: newPostId,
        content: '', // 轉發貼文內容為空
        title: '',
        authorId: userId,
        repostId: postId, // 指向原始貼文
        type: 'normal',
        status: 'published',
      })
      .select()
      .single();

    if (repostError) {
      console.error("Error creating repost post:", repostError);
      return NextResponse.json(
        { error: "Failed to repost" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reposted: true,
      repost: repostPost,
    });
  } catch (error: unknown) {
    console.error("Error reposting:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
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

    // 刪除轉發的 Post 記錄（查找 repostId 指向此貼文的 Post）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('Post')
      .delete()
      .eq('authorId', userId)
      .eq('repostId', postId)
      .eq('status', 'published');

    if (deleteError) {
      console.error("Error deleting repost post:", deleteError);
      return NextResponse.json(
        { error: "Failed to undo repost" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reposted: false,
    });
  } catch (error: unknown) {
    console.error("Error undoing repost:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}


