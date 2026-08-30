import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/volunteer";

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.success) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();

    const [participantsResult, teamsResult, attendanceResult, passesResult] = await Promise.all([
      supabase.from("participants").select("id", { count: "exact", head: true }),
      supabase.from("teams").select("id", { count: "exact", head: true }),
      supabase.from("attendance").select("checkpoint", { count: "exact", head: true }),
      supabase.from("pass_deliveries").select("status", { count: "exact", head: true }),
    ]);

    const checkpointCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    
    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("checkpoint");
    
    if (attendanceData) {
      for (const a of attendanceData) {
        checkpointCounts[a.checkpoint] = (checkpointCounts[a.checkpoint] || 0) + 1;
      }
    }

    const passCounts: Record<string, number> = { PENDING: 0, SENT: 0, FAILED: 0 };
    const { data: passData } = await supabase
      .from("pass_deliveries")
      .select("status");
    
    if (passData) {
      for (const p of passData) {
        passCounts[p.status] = (passCounts[p.status] || 0) + 1;
      }
    }

    return NextResponse.json({
      participants: participantsResult.count ?? 0,
      teams: teamsResult.count ?? 0,
      attendance: {
        total: attendanceResult.count ?? 0,
        byCheckpoint: checkpointCounts,
      },
      passes: {
        total: passesResult.count ?? 0,
        byStatus: passCounts,
      },
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
