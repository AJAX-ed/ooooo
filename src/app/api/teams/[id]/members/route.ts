import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveVolunteer } from "@/lib/auth/volunteer";
import { teamMemberAddSchema } from "@/lib/zod/schemas";
import { hashQrToken } from "@/lib/qr/tokens";

export async function POST(request: NextRequest) {
  try {
    const volunteerCheck = await requireActiveVolunteer();
    if (!volunteerCheck.success) {
      return NextResponse.json({ error: volunteerCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const validated = teamMemberAddSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Find participant by QR token hash
    const qrTokenHash = hashQrToken(validated.participant_qr_token);
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id, full_name, registration_number")
      .eq("qr_token_hash", qrTokenHash)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: "Participant not found" }, { status: 404 });
    }

    // Check if already in a team
    const { data: existingMembership } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("participant_id", participant.id)
      .single();

    if (existingMembership) {
      const { data: existingTeam } = await supabase
        .from("teams")
        .select("team_number, team_name")
        .eq("id", existingMembership.team_id)
        .single();
      
      return NextResponse.json(
        { 
          error: `Participant is already assigned to Team ${existingTeam?.team_number}`,
          conflict: true,
          existingTeam 
        },
        { status: 409 }
      );
    }

    // Add to team
    const { data: membership, error: insertError } = await supabase
      .from("team_members")
      .insert({
        team_id: validated.team_id,
        participant_id: participant.id,
        added_by: user!.id,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Participant is already in this team" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      participant: {
        full_name: participant.full_name,
        registration_number: participant.registration_number,
      },
    });
  } catch (error) {
    console.error("Failed to add team member:", error);
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as import("zod").ZodError;
      return NextResponse.json({ error: "Validation failed", details: zodError.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add team member" }, { status: 500 });
  }
}
