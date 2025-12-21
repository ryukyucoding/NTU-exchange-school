import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db";

/**
 * GET /api/boards/school/[schoolId]
 * 回傳學校看板資訊 + 追蹤數/貼文數
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const { schoolId } = await params;

    let supabase;
    try {
      supabase = getSupabaseServer();
    } catch {
      supabase = null;
    }

    if (!supabase) {
      return NextResponse.json({
        success: true,
        board: {
          id: null,
          type: "school",
          name: schoolId,
          schoolId,
        },
        stats: {
          followerCount: 0,
          postCount: 0,
        },
      });
    }

    const { data: existingBoard, error: boardFetchError } = await supabase
      .from("Board")
      .select("id,name,slug,type,country_id,schoolId,description")
      .eq("type", "school")
      .eq("schoolId", schoolId)
      .limit(1)
      .maybeSingle();

    if (boardFetchError) {
      console.error("Error fetching school board:", boardFetchError);
    }

    let board = existingBoard as any;

    if (!board) {
      const newId = crypto.randomUUID();
      const slug = `school-${schoolId}`;
      const { data: created, error: createError } = await supabase
        .from("Board")
        .insert({
          id: newId,
          type: "school",
          name: schoolId,
          slug,
          country_id: null,
          schoolId,
          description: null,
        } as any)
        .select("id,name,slug,type,country_id,schoolId,description")
        .single();

      if (createError) {
        console.error("Error creating school board:", createError);
        board = {
          id: null,
          type: "school",
          name: schoolId,
          schoolId,
        };
      } else {
        board = created;
      }
    }

    const boardId = board?.id;

    let followerCount = 0;
    let postCount = 0;
    let avgRatings = {
      livingConvenience: 0,
      costOfLiving: 0,
      courseLoading: 0,
    };

    if (boardId) {
      const [{ count: followerExact }, { count: postExact }, { data: postBoardData }] = await Promise.all([
        supabase
          .from("BoardFollow")
          .select("*", { count: "exact", head: true })
          .eq("boardId", boardId),
        supabase
          .from("PostBoard")
          .select("*", { count: "exact", head: true })
          .eq("boardId", boardId),
        supabase
          .from("PostBoard")
          .select("postId")
          .eq("boardId", boardId),
      ]);

      followerCount = followerExact || 0;
      postCount = postExact || 0;

      // 計算平均評分
      if (postBoardData && postBoardData.length > 0) {
        const postIds = postBoardData.map((pb: any) => pb.postId);
        const { data: ratingsData } = await supabase
          .from("SchoolRating")
          .select("livingConvenience, costOfLiving, courseLoading")
          .in("postId", postIds)
          .eq("schoolId", schoolId);

        if (ratingsData && ratingsData.length > 0) {
          const total = ratingsData.length;
          avgRatings = {
            livingConvenience:
              ratingsData.reduce((sum: number, r: any) => sum + (r.livingConvenience || 0), 0) / total,
            costOfLiving:
              ratingsData.reduce((sum: number, r: any) => sum + (r.costOfLiving || 0), 0) / total,
            courseLoading:
              ratingsData.reduce((sum: number, r: any) => sum + (r.courseLoading || 0), 0) / total,
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      board,
      stats: {
        followerCount,
        postCount,
      },
      avgRatings,
    });
  } catch (error: any) {
    console.error("Error in GET /api/boards/school/[schoolId]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


