import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    // Auth failed or no user - redirect to login
    redirect("/volunteer?auth=failed");
  }

  // Check if user is an authorized volunteer
  const { data: volunteer } = await supabase
    .from("volunteers")
    .select("id, name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!volunteer) {
    // User exists in auth but not in volunteers table
    redirect("/volunteer?status=unauthorized");
  }

  if (!volunteer.is_active) {
    // User is inactive
    redirect("/volunteer?status=inactive");
  }

  // Successful auth and authorization - redirect based on role
  if (volunteer.role === "ADMIN") {
    redirect("/admin");
  } else {
    redirect("/volunteer?status=success");
  }
}
