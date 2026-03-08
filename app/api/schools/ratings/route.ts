import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db";

/**
 * POST /api/schools/ratings
 * 批量獲取學校的平均評分
 * Body: { schoolIds: string[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolIds } = body;

    if (!Array.isArray(schoolIds) || schoolIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "schoolIds must be a non-empty array" },
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

    // 將 schoolIds 轉換為數字數組
    const schoolIdNums = schoolIds.map((id) => parseInt(String(id), 10)).filter((id) => !isNaN(id));

    if (schoolIdNums.length === 0) {
      return NextResponse.json(
        { success: true, ratings: {} },
        { status: 200 }
      );
    }

    // 查詢所有相關的評分數據
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ratingsData, error } = await (supabase as any)
      .from("SchoolRating")
      .select("schoolId, livingConvenience, courseLoading")
      .in("schoolId", schoolIdNums);

    if (error) {
      console.error("Error fetching school ratings:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch ratings" },
        { status: 500 }
      );
    }

    // 計算每個學校的平均評分
    const ratingsMap: Record<string, { avgRating: number | null; count: number }> = {};

    // 初始化所有學校的評分為 null
    schoolIdNums.forEach((id) => {
      ratingsMap[String(id)] = { avgRating: null, count: 0 };
    });

    // 計算平均評分
    if (ratingsData && ratingsData.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const typedRatingsData = ratingsData as {
        schoolId: number;
        livingConvenience: number | null;
        courseLoading: number | null;
      }[];

      // 按學校分組
      const schoolGroups: Record<string, { livingConvenience: number[]; courseLoading: number[] }> = {};
      
      typedRatingsData.forEach((r) => {
        const schoolIdStr = String(r.schoolId);
        if (!schoolGroups[schoolIdStr]) {
          schoolGroups[schoolIdStr] = { livingConvenience: [], courseLoading: [] };
        }
        if (r.livingConvenience != null) {
          schoolGroups[schoolIdStr].livingConvenience.push(r.livingConvenience);
        }
        if (r.courseLoading != null) {
          schoolGroups[schoolIdStr].courseLoading.push(r.courseLoading);
        }
      });

      // 計算每個學校的平均值（livingConvenience 和 courseLoading 的平均）
      Object.keys(schoolGroups).forEach((schoolIdStr) => {
        const group = schoolGroups[schoolIdStr];
        const allRatings = [...group.livingConvenience, ...group.courseLoading];
        
        if (allRatings.length > 0) {
          const sum = allRatings.reduce((acc, val) => acc + val, 0);
          const avg = sum / allRatings.length;
          ratingsMap[schoolIdStr] = {
            avgRating: Math.round(avg * 10) / 10, // 保留一位小數
            count: allRatings.length,
          };
        }
      });
    }

    return NextResponse.json({
      success: true,
      ratings: ratingsMap,
    });
  } catch (error: unknown) {
    console.error("Error in POST /api/schools/ratings:", error);
    return NextResponse.json(
      { success: false, error: "伺服器錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}

