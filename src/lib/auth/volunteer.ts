import { createSupabaseServerClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export interface VolunteerAuthResult {
  isAuthenticated: boolean;
  isAuthorized: boolean;
  isAdmin: boolean;
  isActive: boolean;
  volunteer?: {
    id: string;
    email: string;
    name: string;
    role: "ADMIN" | "VOLUNTEER";
  };
  error?: string;
}

export async function checkVolunteerAuth(): Promise<VolunteerAuthResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        isAuthenticated: false,
        isAuthorized: false,
        isAdmin: false,
        isActive: false,
        error: "Not authenticated",
      };
    }

    const { data: volunteer, error: volunteerError } = await supabase
      .from("volunteers")
      .select("id, email, name, role, is_active")
      .eq("id", user.id)
      .single();

    if (volunteerError || !volunteer) {
      return {
        isAuthenticated: true,
        isAuthorized: false,
        isAdmin: false,
        isActive: false,
        error: "Not authorized as volunteer",
      };
    }

    if (!volunteer.is_active) {
      return {
        isAuthenticated: true,
        isAuthorized: false,
        isAdmin: false,
        isActive: false,
        volunteer: {
          id: volunteer.id,
          email: volunteer.email,
          name: volunteer.name,
          role: volunteer.role,
        },
        error: "Volunteer account is inactive",
      };
    }

    return {
      isAuthenticated: true,
      isAuthorized: true,
      isAdmin: volunteer.role === "ADMIN",
      isActive: true,
      volunteer: {
        id: volunteer.id,
        email: volunteer.email,
        name: volunteer.name,
        role: volunteer.role,
      },
    };
  } catch (error) {
    console.error("Auth check failed:", error);
    return {
      isAuthenticated: false,
      isAuthorized: false,
      isAdmin: false,
      isActive: false,
      error: "Authentication check failed",
    };
  }
}

export async function requireAdmin(): Promise<{ success: boolean; error?: string }> {
  const result = await checkVolunteerAuth();
  if (!result.isAuthenticated || !result.isAdmin) {
    return { success: false, error: "Admin access required" };
  }
  return { success: true };
}

export async function requireActiveVolunteer(): Promise<{ success: boolean; error?: string }> {
  const result = await checkVolunteerAuth();
  if (!result.isAuthenticated || !result.isActive) {
    return { success: false, error: "Active volunteer access required" };
  }
  return { success: true };
}
