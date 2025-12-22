import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";

/**
 * GET /api/wishlist
 * 获取当前用户的所有收藏（包含order和note）
 * 返回所有记录，按order排序（null的在最后）
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "請先登入" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const supabase = getSupabaseServer();

    // 查询用户的所有收藏，按order排序（null在最后）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: wishlistItems, error } = await (supabase as any)
      .from('SchoolWishList')
      .select('id, schoolId, note, order, createdAt, updatedAt')
      .eq('userId', userId)
      .order('order', { ascending: true, nullsLast: true })
      .order('createdAt', { ascending: false });

    // 将 schoolId 从 bigint 转换为字符串以匹配前端类型
    const formattedItems = (wishlistItems || []).map((item: { schoolId: number | string }) => ({
      ...item,
      schoolId: String(item.schoolId),
    }));

    if (error) {
      console.error("Error fetching wishlist:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch wishlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      wishlist: formattedItems,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/wishlist:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wishlist
 * 添加收藏（可选note）
 * body: { schoolId: string, note?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "請先登入" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const { schoolId, note } = await req.json();

    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: "schoolId is required" },
        { status: 400 }
      );
    }

    // 将 schoolId 转换为数字（bigint）
    const schoolIdNum = parseInt(schoolId, 10);
    if (isNaN(schoolIdNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid schoolId" },
        { status: 400 }
      );
    }

    // 验证note长度（最多100字符）
    if (note && note.length > 100) {
      return NextResponse.json(
        { success: false, error: "备注最多100字符" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database connection failed" },
        { status: 500 }
      );
    }

    // 检查是否已存在
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing, error: checkError } = await (supabase as any)
      .from('SchoolWishList')
      .select('id')
      .eq('userId', userId)
      .eq('schoolId', schoolIdNum)
      .maybeSingle();

    // 如果表不存在，返回友好错误
    if (checkError) {
      if (checkError.code === 'PGRST116' || 
          checkError.code === '42P01' ||
          checkError.message?.includes('relation') || 
          checkError.message?.includes('does not exist')) {
        console.error("SchoolWishList table does not exist. Please run the migration script.");
        return NextResponse.json(
          { 
            success: false, 
            error: "收藏功能尚未初始化，請聯繫管理員",
            details: "Table SchoolWishList does not exist"
          },
          { status: 500 }
        );
      }
      console.error("Error checking existing wishlist item:", checkError);
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: "此學校已在收藏清單中" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('SchoolWishList')
      .insert({
        id,
        userId,
        schoolId: schoolIdNum,
        note: note || null,
        order: null, // 新添加的收藏默认不在志愿序中
      })
      .select('id, schoolId, note, order, createdAt, updatedAt')
      .single();

    // 将 schoolId 转换为字符串
    if (data) {
      data.schoolId = String(data.schoolId);
    }

    if (error) {
      console.error("Error creating wishlist item:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      console.error("Attempted insert data:", {
        id,
        userId,
        schoolId: schoolIdNum,
        note: note || null,
        order: null,
      });
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to add to wishlist",
          details: error.message || JSON.stringify(error),
          code: error.code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item: data,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/wishlist:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/wishlist
 * 更新收藏（note或order）
 * body: { schoolId: string, note?: string, order?: number | null }
 * 或批量更新order: { updates: [{ schoolId: string, order: number }] }
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "請先登入" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const body = await req.json();
    const supabase = getSupabaseServer();

    // 批量更新order（用于拖拽排序）
    if (body.updates && Array.isArray(body.updates)) {
      const updates = body.updates as { schoolId: string; order: number }[];
      
      // 将 schoolId 转换为数字
      const schoolIdNums = updates.map(u => {
        const num = parseInt(u.schoolId, 10);
        if (isNaN(num)) {
          throw new Error(`Invalid schoolId: ${u.schoolId}`);
        }
        return num;
      });
      
      // 验证所有schoolId都属于当前用户
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existingItems } = await (supabase as any)
        .from('SchoolWishList')
        .select('schoolId')
        .eq('userId', userId)
        .in('schoolId', schoolIdNums);

      if (!existingItems || existingItems.length !== schoolIdNums.length) {
        return NextResponse.json(
          { success: false, error: "部分學校不存在於收藏清單中" },
          { status: 400 }
        );
      }

      // 批量更新
      const updatePromises = updates.map(({ schoolId, order }) => {
        const schoolIdNum = parseInt(schoolId, 10);
        return (supabase as any)
          .from('SchoolWishList')
          .update({ order })
          .eq('userId', userId)
          .eq('schoolId', schoolIdNum);
      });

      await Promise.all(updatePromises);

      return NextResponse.json({
        success: true,
      });
    }

    // 单个更新
    const { schoolId, note, order } = body;

    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: "schoolId is required" },
        { status: 400 }
      );
    }

    // 将 schoolId 转换为数字
    const schoolIdNum = parseInt(schoolId, 10);
    if (isNaN(schoolIdNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid schoolId" },
        { status: 400 }
      );
    }

    // 验证note长度
    if (note !== undefined && note !== null && note.length > 100) {
      return NextResponse.json(
        { success: false, error: "备注最多100字符" },
        { status: 400 }
      );
    }

    // 验证order（如果提供）
    if (order !== undefined && order !== null && order < 1) {
      return NextResponse.json(
        { success: false, error: "order must be >= 1" },
        { status: 400 }
      );
    }

    // 检查是否存在
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('SchoolWishList')
      .select('id')
      .eq('userId', userId)
      .eq('schoolId', schoolIdNum)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "此學校不在收藏清單中" },
        { status: 404 }
      );
    }

    // 构建更新对象
    const updateData: { note?: string | null; order?: number | null } = {};
    if (note !== undefined) {
      updateData.note = note || null;
    }
    if (order !== undefined) {
      updateData.order = order || null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('SchoolWishList')
      .update(updateData)
      .eq('userId', userId)
      .eq('schoolId', schoolIdNum)
      .select('id, schoolId, note, order, createdAt, updatedAt')
      .single();

    // 将 schoolId 转换为字符串
    if (data) {
      data.schoolId = String(data.schoolId);
    }

    if (error) {
      console.error("Error updating wishlist item:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update wishlist item" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item: data,
    });
  } catch (error: unknown) {
    console.error("Error in PUT /api/wishlist:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wishlist
 * 删除收藏（通过schoolId）
 * query: ?schoolId=xxx
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "請先登入" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: "schoolId is required" },
        { status: 400 }
      );
    }

    // 将 schoolId 转换为数字
    const schoolIdNum = parseInt(schoolId, 10);
    if (isNaN(schoolIdNum)) {
      return NextResponse.json(
        { success: false, error: "Invalid schoolId" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('SchoolWishList')
      .delete()
      .eq('userId', userId)
      .eq('schoolId', schoolIdNum);

    if (error) {
      console.error("Error deleting wishlist item:", error);
      return NextResponse.json(
        { success: false, error: "Failed to delete wishlist item" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/wishlist:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

