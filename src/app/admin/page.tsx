import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkVolunteerAuth } from "@/lib/auth/volunteer";

async function getDashboardStats() {
  const supabase = await createSupabaseServerClient();
  
  const [
    participantResult,
    teamResult,
    attendanceResult,
    volunteerResult,
    passDeliveryResult
  ] = await Promise.all([
    supabase.from("participants").select("*", { count: "exact", head: true }),
    supabase.from("teams").select("*", { count: "exact", head: true }),
    supabase.from("attendance").select("*", { count: "exact", head: true }),
    supabase.from("volunteers").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("pass_deliveries").select("*", { count: "exact", head: true }).eq("status", "SENT")
  ]);

  return {
    participants: participantResult.count ?? 0,
    teams: teamResult.count ?? 0,
    attendance: attendanceResult.count ?? 0,
    activeVolunteers: volunteerResult.count ?? 0,
    passesSent: passDeliveryResult.count ?? 0
  };
}

export default async function AdminDashboard() {
  const authResult = await checkVolunteerAuth();
  
  if (!authResult.isAuthenticated) {
    redirect("/admin?login=required");
  }
  
  if (!authResult.isAuthorized || !authResult.isAdmin) {
    redirect("/volunteer?status=unauthorized");
  }

  const stats = await getDashboardStats();

  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* Header */}
      <header className="border-b border-white/10 bg-panel">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-coral text-sm font-black tracking-tight text-ink">RD</div>
              <div>
                <p className="text-sm font-bold tracking-[0.18em] text-paper">REGDESK</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Admin Console</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-muted">Logged in as</p>
                <p className="text-sm font-bold text-paper">{authResult.volunteer?.name}</p>
              </div>
              <form action="/api/auth/logout" method="POST">
                <button type="submit" className="min-h-10 items-center border border-white/20 px-4 text-xs font-bold uppercase tracking-wider transition-colors hover:border-coral hover:text-coral flex">
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Navigation */}
        <nav className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {[
            { href: "/admin", label: "Dashboard", active: true },
            { href: "/admin/participants", label: "Participants" },
            { href: "/admin/volunteers", label: "Volunteers" },
            { href: "/admin/event", label: "Event Settings" },
            { href: "/admin/audit", label: "Audit Log" }
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${
                item.active 
                  ? "bg-coral text-ink" 
                  : "text-muted hover:text-coral hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Dashboard Content */}
        <main>
          <h1 className="mb-6 text-2xl font-black tracking-tight">Dashboard Overview</h1>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Total Participants" value={stats.participants} />
            <StatCard title="Teams Formed" value={stats.teams} />
            <StatCard title="Attendance Records" value={stats.attendance} />
            <StatCard title="Active Volunteers" value={stats.activeVolunteers} />
            <StatCard title="Passes Sent" value={stats.passesSent} accent="mint" />
          </div>

          {/* Quick Actions */}
          <div className="mt-8 rounded-lg border border-white/10 bg-panel p-6">
            <h2 className="mb-4 text-lg font-bold text-paper">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/participants" className="min-h-11 items-center bg-coral px-5 text-sm font-bold text-ink transition-colors hover:bg-paper flex">
                Manage Participants
              </Link>
              <Link href="/admin/volunteers" className="min-h-11 items-center border border-white/20 px-5 text-sm font-bold transition-colors hover:border-coral hover:text-coral flex">
                Manage Volunteers
              </Link>
              <Link href="/admin/event" className="min-h-11 items-center border border-white/20 px-5 text-sm font-bold transition-colors hover:border-coral hover:text-coral flex">
                Event Settings
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value, accent = "coral" }: { title: string; value: number; accent?: "coral" | "mint" }) {
  const accentClass = accent === "mint" ? "text-mint" : "text-coral";
  
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-6">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">{title}</p>
      <p className={`mt-2 text-4xl font-black ${accentClass}`}>{value}</p>
    </div>
  );
}
