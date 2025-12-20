import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/db";

/**
 * GET /api/user/qualification
 * 獲取用戶的資格篩選設定
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

    const userId = (session.user as any).id;
    
    // 驗證用戶是否存在於 User 表中
    const supabase = getSupabaseServer();
    const { data: userExists, error: userCheckError } = await supabase
      .from('User')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error("Error checking user existence:", userCheckError);
      return NextResponse.json(
        { error: "Failed to verify user" },
        { status: 500 }
      );
    }

    if (!userExists) {
      console.error("User not found in database:", userId);
      return NextResponse.json(
        { error: "用戶不存在於資料庫中，請重新登入" },
        { status: 404 }
      );
    }

    // 查詢 UserQualification 表
    const { data: qualification, error } = await supabase
      .from('UserQualification')
      .select('college, grade, gpa, toefl, ielts, toeic')
      .eq('userId', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching user qualification:", error);
      return NextResponse.json(
        { error: "Failed to fetch user qualification" },
        { status: 500 }
      );
    }

    // 如果沒有記錄，返回空值
    if (!qualification) {
      return NextResponse.json({
        success: true,
        qualification: {
          college: null,
          grade: null,
          gpa: null,
          toefl: null,
          ielts: null,
          toeic: null,
        },
      });
    }

    return NextResponse.json({
      success: true,
      qualification: {
        college: qualification.college || null,
        grade: qualification.grade || null,
        gpa: qualification.gpa ? parseFloat(qualification.gpa.toString()) : null,
        toefl: qualification.toefl || null,
        ielts: qualification.ielts ? parseFloat(qualification.ielts.toString()) : null,
        toeic: qualification.toeic || null,
      },
    });
  } catch (error: any) {
    console.error("Error in GET /api/user/qualification:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/qualification
 * 更新用戶的資格篩選設定
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

    const userId = (session.user as any).id;
    
    // 驗證用戶是否存在於 User 表中
    const supabase = getSupabaseServer();
    const { data: userExists, error: userCheckError } = await supabase
      .from('User')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error("Error checking user existence:", userCheckError);
      return NextResponse.json(
        { error: "Failed to verify user" },
        { status: 500 }
      );
    }

    if (!userExists) {
      console.error("User not found in database:", userId);
      return NextResponse.json(
        { error: "用戶不存在於資料庫中，請重新登入" },
        { status: 404 }
      );
    }

    const qualification = await req.json();

    // 驗證數據
    const { college, grade, gpa, toefl, ielts, toeic } = qualification;

    // 所有字段都可以為 null，只驗證非 null 值的範圍
    // 驗證 GPA 範圍（只有當 gpa 不是 null 且不是 undefined 時才驗證）
    if (gpa !== null && gpa !== undefined && (gpa < 0 || gpa > 4.3)) {
      return NextResponse.json(
        { error: "GPA 必須在 0 到 4.3 之間" },
        { status: 400 }
      );
    }

    // 驗證 TOEFL 範圍（只有當 toefl 不是 null 且不是 undefined 時才驗證）
    if (toefl !== null && toefl !== undefined && (toefl < 0 || toefl > 120)) {
      return NextResponse.json(
        { error: "TOEFL iBT 分數必須在 0 到 120 之間" },
        { status: 400 }
      );
    }

    // 驗證 IELTS 範圍（只有當 ielts 不是 null 且不是 undefined 時才驗證）
    if (ielts !== null && ielts !== undefined && (ielts < 0 || ielts > 9)) {
      return NextResponse.json(
        { error: "IELTS 分數必須在 0 到 9 之間" },
        { status: 400 }
      );
    }

    // 驗證 TOEIC 範圍（只有當 toeic 不是 null 且不是 undefined 時才驗證）
    if (toeic !== null && toeic !== undefined && (toeic < 0 || toeic > 990)) {
      return NextResponse.json(
        { error: "TOEIC 分數必須在 0 到 990 之間" },
        { status: 400 }
      );
    }

    // 驗證 grade（只有當 grade 不是 null 且不是 undefined 時才驗證）
    const validGrades = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
    if (grade !== null && grade !== undefined && !validGrades.includes(grade)) {
      return NextResponse.json(
        { error: "年級必須是 Freshman, Sophomore, Junior 或 Senior" },
        { status: 400 }
      );
    }

    // 注意：supabase 已在上面創建，這裡不需要重複創建
    // const supabase = getSupabaseServer(); // 已在上面創建

    // 先檢查是否已存在記錄
    const { data: existing } = await supabase
      .from('UserQualification')
      .select('id')
      .eq('userId', userId)
      .maybeSingle();

    let result;
    if (existing) {
      // 更新現有記錄
      const { data, error } = await supabase
        .from('UserQualification')
        .update({
          college: college || null,
          grade: grade || null,
          gpa: gpa !== null ? gpa : null,
          toefl: toefl !== null ? toefl : null,
          ielts: ielts !== null ? ielts : null,
          toeic: toeic !== null ? toeic : null,
          updatedAt: new Date().toISOString(),
        })
        .eq('userId', userId)
        .select('college, grade, gpa, toefl, ielts, toeic')
        .single();

      if (error) {
        console.error("Error updating user qualification:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        return NextResponse.json(
          { 
            error: "Failed to update user qualification",
            details: error.message || JSON.stringify(error),
            code: error.code || 'UNKNOWN'
          },
          { status: 500 }
        );
      }
      result = data;
    } else {
      // 創建新記錄
      const qualificationId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('UserQualification')
        .insert({
          id: qualificationId,
          userId: userId,
          college: college || null,
          grade: grade || null,
          gpa: gpa !== null ? gpa : null,
          toefl: toefl !== null ? toefl : null,
          ielts: ielts !== null ? ielts : null,
          toeic: toeic !== null ? toeic : null,
        })
        .select('college, grade, gpa, toefl, ielts, toeic')
        .single();

      if (error) {
        console.error("Error creating user qualification:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        console.error("Attempted data:", {
          id: qualificationId,
          userId: userId,
          college: college || null,
          grade: grade || null,
          gpa: gpa !== null ? gpa : null,
          toefl: toefl !== null ? toefl : null,
          ielts: ielts !== null ? ielts : null,
          toeic: toeic !== null ? toeic : null,
        });
        return NextResponse.json(
          { 
            error: "Failed to create user qualification",
            details: error.message || JSON.stringify(error),
            code: error.code || 'UNKNOWN'
          },
          { status: 500 }
        );
      }
      result = data;
    }

    return NextResponse.json({
      success: true,
      qualification: {
        college: result?.college || null,
        grade: result?.grade || null,
        gpa: result?.gpa ? parseFloat(result.gpa.toString()) : null,
        toefl: result?.toefl || null,
        ielts: result?.ielts ? parseFloat(result.ielts.toString()) : null,
        toeic: result?.toeic || null,
      },
    });
  } catch (error: any) {
    console.error("Error in PUT /api/user/qualification:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
