import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveVolunteer } from "@/lib/auth/volunteer";
import { teamCreateSchema, teamMemberAddSchema } from "@/lib/zod/schemas";
import { hashQrToken } from "@/lib/qr/tokens";

export async function POST(request: NextRequest) {
  try {
    const volunteerCheck = await requireActiveVolunteer();
    if (!volunteerCheck.success) {
      return NextResponse.json({ error: volunteerCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const validated = teamCreateSchema.parse(body);

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: team, error } = await supabase
      .from("teams")
      .insert({
        team_number: validated.team_number,
        team_name: validated.team_name,
        created_by: user!.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: `Team number ${validated.team_number} already exists` },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error("Failed to create team:", error);
    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as import("zod").ZodError;
      return NextResponse.json({ error: "Validation failed", details: zodError.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const volunteerCheck = await requireActiveVolunteer();
    if (!volunteerCheck.success) {
      return NextResponse.json({ error: volunteerCheck.error }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();

    const { data: teams, error } = await supabase
      .from("teams")
      .select("*")
      .order("team_number", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return NextResponse.json({ error: "Failed to fetch teams" }, { status: 500 });
  }
}
