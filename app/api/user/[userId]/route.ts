import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/db";

/**
 * GET /api/user/[userId]
 * Public user profile lookup (name / image / userID).
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("User")
      .select("id,name,userID,image")
      .eq("id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching user:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data || null,
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/user/[userId]:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}


