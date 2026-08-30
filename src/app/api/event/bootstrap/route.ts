import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveVolunteer } from "@/lib/auth/volunteer";

export async function GET(request: NextRequest) {
  try {
    const volunteerCheck = await requireActiveVolunteer();
    if (!volunteerCheck.success) {
      return NextResponse.json({ error: volunteerCheck.error }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();

    // Fetch all participants with minimal sensitive data
    const { data: participants, error: pError } = await supabase
      .from("participants")
      .select("id, registration_number, full_name, qr_token_hash")
      .order("created_at", { ascending: false });

    if (pError) throw pError;

    // Fetch teams
    const { data: teams, error: tError } = await supabase
      .from("teams")
      .select("*")
      .order("team_number", { ascending: true });

    if (tError) throw tError;

    // Fetch team members
    const { data: teamMembers, error: tmError } = await supabase
      .from("team_members")
      .select("team_id, participant_id, added_by");

    if (tmError) throw tmError;

    // Fetch attendance records
    const { data: attendance, error: aError } = await supabase
      .from("attendance")
      .select("participant_id, checkpoint, recorded_at, device_id");

    if (aError) throw aError;

    return NextResponse.json({
      participants: participants || [],
      teams: teams || [],
      teamMembers: teamMembers || [],
      attendance: attendance || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Bootstrap failed:", error);
    return NextResponse.json(
      { error: "Failed to bootstrap event data" },
      { status: 500 }
    );
  }
}
