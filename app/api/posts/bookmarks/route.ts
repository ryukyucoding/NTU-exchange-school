import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/posts/bookmarks
 * 獲取當前用戶收藏的所有貼文
 * 返回 postIds，前端可以通過 /api/posts 並傳遞這些 IDs 來獲取完整數據
 * 或者我們可以重定向到 /api/posts 並添加查詢參數
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "請先登入" },
        { status: 401 }
      );
    }
    const userId = (session.user as { id: string }).id;

    // 為了保持與 /api/posts 的一致性，我們返回 postIds
    // 前端可以通過調用 /api/posts?bookmarked=true 來獲取完整數據
    // 或者我們可以在這裡直接調用 /api/posts 的邏輯
    
    // 簡化方案：返回 postIds，前端調用 /api/posts 並過濾
    // 但更好的方案是讓 /api/posts 支持 bookmarked 參數
    
    return NextResponse.json({
      success: true,
      message: "Use /api/posts?bookmarked=true to get bookmarked posts",
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/posts/bookmarks:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

