import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";

/**
 * GET /api/posts/[id]/comments
 * 獲取貼文的評論列表
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = id;
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId'); // 可選：獲取特定父評論的子評論

    const supabase = getSupabaseServer();

    // 構建查詢
    let query = (supabase as any)
      .from('Comment')
      .select(`
        id,
        content,
        userId,
        postId,
        parentId,
        createdAt,
        updatedAt,
        User:userId (
          id,
          name,
          userID,
          image
        )
      `)
      .eq('postId', postId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: true });

    // 如果有 parentId，只獲取該父評論的子評論
    // 如果沒有 parentId，只獲取頂層評論（parentId 為 null）
    if (parentId) {
      query = query.eq('parentId', parentId);
    } else {
      query = query.is('parentId', null);
    }

    const { data: comments, error } = await query;

    if (error) {
      console.error("Error fetching comments:", error);
      return NextResponse.json(
        { success: false, error: "無法獲取評論" },
        { status: 500 }
      );
    }

    // 獲取當前用戶ID（如果已登入）
    const session = await auth();
    const currentUserId = session?.user ? (session.user as { id: string }).id : null;

    // 處理評論數據，構建嵌套結構
    const commentIds = (comments || []).map((c: any) => c.id);
    
    // 獲取所有評論的按讚數量和當前用戶的按讚狀態
    let likeCountMap = new Map<string, number>();
    let userLikedMap = new Map<string, boolean>();
    
    if (commentIds.length > 0) {
      // 獲取按讚數量
      const { data: likes } = await (supabase as any)
        .from('CommentLike')
        .select('commentId')
        .in('commentId', commentIds);
      
      (likes || []).forEach((like: { commentId: string }) => {
        likeCountMap.set(like.commentId, (likeCountMap.get(like.commentId) || 0) + 1);
      });

      // 獲取當前用戶的按讚狀態
      if (currentUserId) {
        const { data: userLikes } = await (supabase as any)
          .from('CommentLike')
          .select('commentId')
          .in('commentId', commentIds)
          .eq('userId', currentUserId);
        
        (userLikes || []).forEach((like: { commentId: string }) => {
          userLikedMap.set(like.commentId, true);
        });
      }
    }

    const processedComments = (comments || []).map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      author: comment.User ? {
        id: comment.User.id,
        name: comment.User.name,
        userID: comment.User.userID,
        image: comment.User.image,
      } : null,
      postId: comment.postId,
      parentId: comment.parentId,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      likeCount: likeCountMap.get(comment.id) || 0,
      isLiked: userLikedMap.get(comment.id) || false,
    }));

    // 對於所有評論，獲取每個評論的直接子評論數量
    if (commentIds.length > 0) {
      const { data: childComments } = await (supabase as any)
        .from('Comment')
        .select('parentId')
        .in('parentId', commentIds)
        .is('deletedAt', null);

      const childCountMap = new Map<string, number>();
      (childComments || []).forEach((child: { parentId: string }) => {
        childCountMap.set(child.parentId, (childCountMap.get(child.parentId) || 0) + 1);
      });

      processedComments.forEach((comment: { id: string; childCount?: number }) => {
        comment.childCount = childCountMap.get(comment.id) || 0;
      });
    }

    return NextResponse.json({
      success: true,
      comments: processedComments,
    });
  } catch (error) {
    console.error("Error in GET /api/posts/[id]/comments:", error);
    return NextResponse.json(
      { success: false, error: "伺服器錯誤" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/posts/[id]/comments
 * 創建新評論
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "請先登入" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const { id } = await params;
    const postId = id;
    const { content, parentId } = await req.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "評論內容不能為空" },
        { status: 400 }
      );
    }

    // 如果提供了 parentId，驗證父評論存在且屬於同一貼文
    if (parentId) {
      const supabase = getSupabaseServer();
      const { data: parentComment } = await (supabase as any)
        .from('Comment')
        .select('id, postId')
        .eq('id', parentId)
        .is('deletedAt', null)
        .maybeSingle();

      if (!parentComment || parentComment.postId !== postId) {
        return NextResponse.json(
          { success: false, error: "父評論不存在或屬於不同貼文" },
          { status: 400 }
        );
      }
    }

    const supabase = getSupabaseServer();
    const commentId = crypto.randomUUID();

    const { data: comment, error } = await (supabase as any)
      .from('Comment')
      .insert({
        id: commentId,
        content: content.trim(),
        userId,
        postId,
        parentId: parentId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select(`
        id,
        content,
        userId,
        postId,
        parentId,
        createdAt,
        updatedAt,
        User:userId (
          id,
          name,
          userID,
          image
        )
      `)
      .single();

    if (error) {
      console.error("Error creating comment:", error);
      return NextResponse.json(
        { success: false, error: "無法創建評論" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        author: comment.User ? {
          id: comment.User.id,
          name: comment.User.name,
          userID: comment.User.userID,
          image: comment.User.image,
        } : null,
        postId: comment.postId,
        parentId: comment.parentId,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        childCount: 0,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/posts/[id]/comments:", error);
    return NextResponse.json(
      { success: false, error: "伺服器錯誤" },
      { status: 500 }
    );
  }
}

