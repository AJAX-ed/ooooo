import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth exchange error:", error);
      return NextResponse.redirect(`${requestUrl.origin}/volunteer?auth=failed`);
    }

    // After successful session exchange, check authorization
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(`${requestUrl.origin}/volunteer?auth=failed`);
    }

    // Check if user is an authorized volunteer
    const { data: volunteer } = await supabase
      .from("volunteers")
      .select("id, name, role, is_active")
      .eq("id", user.id)
      .single();

    if (!volunteer) {
      // User exists in auth but not in volunteers table
      return NextResponse.redirect(`${requestUrl.origin}/volunteer?status=unauthorized`);
    }

    if (!volunteer.is_active) {
      // User is inactive
      return NextResponse.redirect(`${requestUrl.origin}/volunteer?status=inactive`);
    }

    // Successful auth and authorization - redirect based on role
    if (volunteer.role === "ADMIN") {
      return NextResponse.redirect(`${requestUrl.origin}/admin`);
    } else {
      return NextResponse.redirect(`${requestUrl.origin}/volunteer?status=success`);
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/volunteer`);
}
