import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/volunteer";

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.success) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const { participant_ids } = body;

    if (!Array.isArray(participant_ids) || participant_ids.length === 0) {
      return NextResponse.json({ error: "No participant IDs provided" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Fetch participants and generate QR codes
    const { data: participants } = await supabase
      .from("participants")
      .select("id, full_name, registration_number, email")
      .in("id", participant_ids);

    if (!participants || participants.length === 0) {
      return NextResponse.json({ error: "No valid participants found" }, { status: 404 });
    }

    // Create pass delivery records
    const deliveries = [];
    for (const p of participants) {
      const { error } = await supabase.from("pass_deliveries").upsert({
        participant_id: p.id,
        email: p.email,
        status: "PENDING",
        attempts: 0,
      });

      if (!error) {
        deliveries.push(p);
      }
    }

    return NextResponse.json({
      success: true,
      queued: deliveries.length,
      participants: deliveries.map(({ id, full_name, registration_number, email }) => ({
        id,
        full_name,
        registration_number,
        email,
      })),
    });
  } catch (error) {
    console.error("Failed to queue pass generation:", error);
    return NextResponse.json(
      { error: "Failed to queue pass generation" },
      { status: 500 }
    );
  }
}
