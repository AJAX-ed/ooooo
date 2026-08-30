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

    const { data: volunteers, error } = await supabase
      .from("volunteers")
      .select("id, email, name, role, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ volunteers });
  } catch (error) {
    console.error("Failed to fetch volunteers:", error);
    return NextResponse.json(
      { error: "Failed to fetch volunteers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.success) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, role, is_active } = body;

    if (!email || !name || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["ADMIN", "VOLUNTEER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Check if volunteer record already exists
    const { data: existingVolunteer } = await supabase
      .from("volunteers")
      .select("id")
      .eq("email", email)
      .single();

    let userId = existingVolunteer?.id;

    // If no existing volunteer record, we need to find/create the auth user
    if (!userId) {
      // List users and find by email (admin operation)
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        return NextResponse.json({ error: "Failed to lookup user" }, { status: 500 });
      }

      const foundUser = usersData.users.find(u => u.email === email);
      
      if (!foundUser) {
        return NextResponse.json({ error: "User not found in auth system. Please ask them to sign in first." }, { status: 404 });
      }

      userId = foundUser.id;
    }

    const { data: volunteer, error: insertError } = await supabase
      .from("volunteers")
      .upsert({
        id: userId,
        email,
        name,
        role,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ volunteer });
  } catch (error) {
    console.error("Failed to manage volunteer:", error);
    return NextResponse.json(
      { error: "Failed to manage volunteer" },
      { status: 500 }
    );
  }
}
