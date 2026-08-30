import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveVolunteer } from "@/lib/auth/volunteer";

export async function POST(request: NextRequest) {
  try {
    const volunteerCheck = await requireActiveVolunteer();
    if (!volunteerCheck.success) {
      return NextResponse.json({ error: volunteerCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const { operations } = body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json({ error: "No operations provided" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const results = [];

    for (const op of operations) {
      try {
        // Check idempotency - has this operation already been processed?
        const { data: existingOp } = await supabase
          .from("sync_operations")
          .select("status, processed_at")
          .eq("operation_id", op.operation_id)
          .single();

        if (existingOp) {
          results.push({
            operation_id: op.operation_id,
            status: "ALREADY_PROCESSED",
            original_status: existingOp.status,
          });
          continue;
        }

        // Record the sync operation as pending
        await supabase.from("sync_operations").insert({
          operation_id: op.operation_id,
          device_id: op.device_id,
          volunteer_id: user!.id,
          operation_type: op.operation_type,
          payload: op.payload,
          status: "PENDING",
          created_at: op.created_at,
        });

        // Process based on operation type
        let result;
        switch (op.operation_type) {
          case "CREATE_TEAM": {
            const { data: team, error } = await supabase
              .from("teams")
              .insert({
                team_number: op.payload.team_number,
                team_name: op.payload.team_name,
                created_by: user!.id,
              })
              .select()
              .single();

            if (error) {
              if (error.code === "23505") {
                await supabase
                  .from("sync_operations")
                  .update({ status: "CONFLICT", processed_at: new Date().toISOString() })
                  .eq("operation_id", op.operation_id);
                
                results.push({ operation_id: op.operation_id, status: "CONFLICT", error: "Team number already exists" });
                continue;
              }
              throw error;
            }
            result = { team };
            break;
          }

          case "ADD_TEAM_MEMBER": {
            const qrTokenHash = op.payload.qr_token_hash;
            const { data: participant } = await supabase
              .from("participants")
              .select("id")
              .eq("qr_token_hash", qrTokenHash)
              .single();

            if (!participant) {
              throw new Error("Participant not found");
            }

            // Check existing membership
            const { data: existingMembership } = await supabase
              .from("team_members")
              .select("team_id")
              .eq("participant_id", participant.id)
              .single();

            if (existingMembership) {
              await supabase
                .from("sync_operations")
                .update({ status: "CONFLICT", processed_at: new Date().toISOString() })
                .eq("operation_id", op.operation_id);
              
              results.push({ operation_id: op.operation_id, status: "CONFLICT", error: "Participant already in a team" });
              continue;
            }

            const { error } = await supabase.from("team_members").insert({
              team_id: op.payload.team_id,
              participant_id: participant.id,
              added_by: user!.id,
            });

            if (error) throw error;
            break;
          }

          case "RECORD_ATTENDANCE": {
            const qrTokenHash = op.payload.qr_token_hash;
            const checkpoint = op.payload.checkpoint;
            
            const { data: participant } = await supabase
              .from("participants")
              .select("id")
              .eq("qr_token_hash", qrTokenHash)
              .single();

            if (!participant) {
              throw new Error("Participant not found");
            }

            // Check existing attendance
            const { data: existingAttendance } = await supabase
              .from("attendance")
              .select("id")
              .eq("participant_id", participant.id)
              .eq("checkpoint", checkpoint)
              .single();

            if (existingAttendance) {
              await supabase
                .from("sync_operations")
                .update({ status: "CONFLICT", processed_at: new Date().toISOString() })
                .eq("operation_id", op.operation_id);
              
              results.push({ operation_id: op.operation_id, status: "CONFLICT", error: "Attendance already recorded" });
              continue;
            }

            const { error } = await supabase.from("attendance").insert({
              participant_id: participant.id,
              checkpoint,
              recorded_by: user!.id,
              device_id: op.device_id,
            });

            if (error) throw error;
            break;
          }

          default:
            throw new Error(`Unknown operation type: ${op.operation_type}`);
        }

        // Mark as applied
        await supabase
          .from("sync_operations")
          .update({ status: "APPLIED", processed_at: new Date().toISOString() })
          .eq("operation_id", op.operation_id);

        results.push({ operation_id: op.operation_id, status: "SYNCED" });
      } catch (error) {
        console.error("Sync operation failed:", error);
        await supabase
          .from("sync_operations")
          .update({ 
            status: "FAILED", 
            processed_at: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Unknown error"
          })
          .eq("operation_id", op.operation_id);

        results.push({ 
          operation_id: op.operation_id, 
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const volunteerCheck = await requireActiveVolunteer();
    if (!volunteerCheck.success) {
      return NextResponse.json({ error: volunteerCheck.error }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: operations } = await supabase
      .from("sync_operations")
      .select("*")
      .eq("volunteer_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(100);

    return NextResponse.json({ operations: operations || [] });
  } catch (error) {
    console.error("Failed to fetch sync operations:", error);
    return NextResponse.json({ error: "Failed to fetch sync operations" }, { status: 500 });
  }
}
