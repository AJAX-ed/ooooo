import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkVolunteerAuth } from "@/lib/auth/volunteer";

async function getVolunteers() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("volunteers")
    .select("id, email, name, role, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching volunteers:", error);
    return [];
  }

  return data || [];
}

export default async function VolunteersPage() {
  const authResult = await checkVolunteerAuth();
  
  if (!authResult.isAuthenticated || !authResult.isAdmin) {
    redirect("/volunteer?status=unauthorized");
  }

  const volunteers = await getVolunteers();

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
            { href: "/admin/volunteers", label: "Volunteers", active: true },
            { href: "/admin/event", label: "Event Settings" },
            { href: "/admin/audit", label: "Audit Log" }
          ].map((item) => (
            <Link key={item.href} href={item.href} className={`rounded-md px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${item.active ? "bg-coral text-ink" : "text-muted hover:text-coral hover:bg-white/5"}`}>{item.label}</Link>
          ))}
        </nav>

        <main>
          <h1 className="mb-6 text-2xl font-black tracking-tight">Volunteers</h1>
          
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-panel">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {volunteers.length > 0 ? (
                  volunteers.map((v) => (
                    <tr key={v.id} className="hover:bg-white/5">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-paper">{v.name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">{v.email}</td>
                      <td className="whitespace-nowrap px-6 py-4"><span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${v.role === "ADMIN" ? "bg-coral/20 text-coral" : "bg-muted/20 text-muted"}`}>{v.role}</span></td>
                      <td className="whitespace-nowrap px-6 py-4"><span className={`inline-flex items-center gap-1 text-xs font-bold ${v.is_active ? "text-mint" : "text-red-400"}`}><span className={`h-2 w-2 rounded-full ${v.is_active ? "bg-mint" : "bg-red-400"}`}></span>{v.is_active ? "Active" : "Inactive"}</span></td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-muted">No volunteers found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
