import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkVolunteerAuth } from "@/lib/auth/volunteer";

async function getEventConfig() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("event_config")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching event config:", error);
    return null;
  }

  return data;
}

export default async function EventSettingsPage() {
  const authResult = await checkVolunteerAuth();
  
  if (!authResult.isAuthenticated || !authResult.isAdmin) {
    redirect("/volunteer?status=unauthorized");
  }

  const eventConfig = await getEventConfig();

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="border-b border-white/10 bg-panel">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-coral text-sm font-black tracking-tight text-ink">RD</div>
              <div>
                <p className="text-sm font-bold tracking-[0.18em] text-paper">REGDESK</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Admin Console</p>
              </div>
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="min-h-10 items-center border border-white/20 px-4 text-xs font-bold uppercase tracking-wider transition-colors hover:border-coral hover:text-coral flex">Logout</button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <nav className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {[
            { href: "/admin", label: "Dashboard" },
            { href: "/admin/participants", label: "Participants" },
            { href: "/admin/volunteers", label: "Volunteers" },
            { href: "/admin/event", label: "Event Settings", active: true },
            { href: "/admin/audit", label: "Audit Log" }
          ].map((item) => (
            <Link key={item.href} href={item.href} className={`rounded-md px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${item.active ? "bg-coral text-ink" : "text-muted hover:text-coral hover:bg-white/5"}`}>{item.label}</Link>
          ))}
        </nav>

        <main className="max-w-2xl">
          <h1 className="mb-6 text-2xl font-black tracking-tight">Event Settings</h1>
          
          <div className="rounded-lg border border-white/10 bg-panel p-6">
            {eventConfig ? (
              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted">Event Name</dt>
                  <dd className="mt-1 text-lg font-medium text-paper">{eventConfig.event_name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted">Event Date</dt>
                  <dd className="mt-1 text-lg font-medium text-paper">{eventConfig.event_date ? new Date(eventConfig.event_date).toLocaleDateString() : "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted">Venue</dt>
                  <dd className="mt-1 text-lg font-medium text-paper">{eventConfig.venue || "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-muted">Status</dt>
                  <dd className="mt-1"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${eventConfig.is_active ? "bg-mint/20 text-mint" : "bg-muted/20 text-muted"}`}>{eventConfig.is_active ? "Active" : "Inactive"}</span></dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted">No event configuration found. Create one in the database.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
