import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveVolunteer } from "@/lib/auth/volunteer";
import { attendanceRecordSchema } from "@/lib/zod/schemas";
import { hashQrToken } from "@/lib/qr/tokens";

export async function POST(request: NextRequest) {
  try {
    const volunteerCheck = await requireActiveVolunteer();
    if (!volunteerCheck.success) {
      return NextResponse.json({ error: volunteerCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const validated = attendanceRecordSchema.parse(body);

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

    // Check if attendance already recorded for this checkpoint
    const { data: existingAttendance } = await supabase
      .from("attendance")
      .select("recorded_at")
      .eq("participant_id", participant.id)
      .eq("checkpoint", validated.checkpoint)
      .single();

    if (existingAttendance) {
      return NextResponse.json(
        { 
          error: `Attendance was already recorded at Checkpoint ${validated.checkpoint}`,
          conflict: true,
          recorded_at: existingAttendance.recorded_at,
        },
        { status: 409 }
      );
    }

    // Record attendance
    const { data: attendance, error: insertError } = await supabase
      .from("attendance")
      .insert({
        participant_id: participant.id,
        checkpoint: validated.checkpoint,
        recorded_by: user!.id,
        device_id: validated.device_id,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: `Attendance was already recorded at Checkpoint ${validated.checkpoint}` },
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
      attendance: {
        checkpoint: validated.checkpoint,
        recorded_at: attendance.recorded_at,
      },
    });
  } catch (error) {
    console.error("Failed to record attendance:", error);
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as import("zod").ZodError;
      return NextResponse.json({ error: "Validation failed", details: zodError.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to record attendance" }, { status: 500 });
  }
}
