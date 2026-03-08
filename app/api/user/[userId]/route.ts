import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db";
import { auth } from "@/lib/auth";

/**
 * GET /api/user/[userId]
 * Public user profile lookup (name / image / userID / bio / backgroundImage / postCount).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    let supabase;
    try {
      supabase = getSupabaseServer();
    } catch (_err) {
      // Allow UI to render even without DB env configured
      return NextResponse.json({
        success: true,
        user: null,
      });
    }

    // Fetch user info
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("User")
      .select("id,name,userID,image,bio,backgroundImage")
      .eq("id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching user:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch user" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        success: true,
        user: null,
      });
    }

    // Fetch post count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error: countError } = await (supabase as any)
      .from("Post")
      .select("*", { count: "exact", head: true })
      .eq("authorId", userId)
      .eq("status", "published")
      .is("deletedAt", null);

    if (countError) {
      console.error("Error fetching post count:", countError);
    }

    return NextResponse.json({
      success: true,
      user: {
        ...data,
        postCount: count || 0,
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/user/[userId]:", error);
    return NextResponse.json(
      { success: false, error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/[userId]
 * Update user profile (name / bio / image / backgroundImage).
 * Only the user themselves can update their profile.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "請先登入" },
        { status: 401 }
      );
    }

    const { userId } = await params;
    const currentUserId = (session.user as { id: string }).id;

    // Only allow users to update their own profile
    if (currentUserId !== userId) {
      return NextResponse.json(
        { success: false, error: "無權限修改此用戶資料" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, bio, image, backgroundImage } = body;

    let supabase;
    try {
      supabase = getSupabaseServer();
    } catch (_err) {
      return NextResponse.json(
        { success: false, error: "資料庫未配置" },
        { status: 500 }
      );
    }

    // Build update object
    const updateData: {
      name?: string | null;
      bio?: string | null;
      image?: string | null;
      backgroundImage?: string | null;
      updatedAt?: string;
    } = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name || null;
    if (bio !== undefined) updateData.bio = bio || null;
    if (image !== undefined) updateData.image = image || null;
    if (backgroundImage !== undefined) updateData.backgroundImage = backgroundImage || null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("User")
      .update(updateData)
      .eq("id", userId)
      .select("id,name,userID,image,bio,backgroundImage")
      .single();

    if (error) {
      console.error("Error updating user:", error);
      return NextResponse.json(
        { success: false, error: "更新失敗" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data,
    });
  } catch (error: unknown) {
    console.error("Error in PUT /api/user/[userId]:", error);
    return NextResponse.json(
      { success: false, error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}


