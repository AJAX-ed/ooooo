import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refresh session
  await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public paths that don't require auth
  const publicPaths = ["/", "/auth/callback"];
  if (publicPaths.some((p) => pathname === p || pathname.startsWith("/auth/"))) {
    return response;
  }

  // Protected paths
  const isAdminPath = pathname.startsWith("/admin");
  const isVolunteerPath = pathname.startsWith("/volunteer");

  if (isAdminPath || isVolunteerPath) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Not authenticated - redirect to volunteer login
      const redirectUrl = new URL("/volunteer", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Check if user is an authorized active volunteer
    const { data: volunteer } = await supabase
      .from("volunteers")
      .select("id, role, is_active")
      .eq("id", user.id)
      .single();

    if (!volunteer || !volunteer.is_active) {
      // Not authorized or inactive
      const redirectUrl = new URL("/volunteer?status=unauthorized", request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Admin-only routes
    if (isAdminPath && volunteer.role !== "ADMIN") {
      const redirectUrl = new URL("/volunteer?status=unauthorized", request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
