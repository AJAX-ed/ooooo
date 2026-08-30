import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkVolunteerAuth } from "@/lib/auth/volunteer";

async function getAuditLogs(page: number = 1) {
  const supabase = await createSupabaseServerClient();
  const pageSize = 50;
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const { data, error, count } = await supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .range(start, end)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching audit logs:", error);
    return { logs: [], total: 0, totalPages: 0 };
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  return { logs: data || [], total: count || 0, totalPages };
}

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const authResult = await checkVolunteerAuth();
  
  if (!authResult.isAuthenticated || !authResult.isAdmin) {
    redirect("/volunteer?status=unauthorized");
  }

  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const { logs, total, totalPages } = await getAuditLogs(page);

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
            { href: "/admin/event", label: "Event Settings" },
            { href: "/admin/audit", label: "Audit Log", active: true }
          ].map((item) => (
            <Link key={item.href} href={item.href} className={`rounded-md px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${item.active ? "bg-coral text-ink" : "text-muted hover:text-coral hover:bg-white/5"}`}>{item.label}</Link>
          ))}
        </nav>

        <main>
          <h1 className="mb-6 text-2xl font-black tracking-tight">Audit Log</h1>
          
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-panel">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Target</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-paper">{log.action}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">{log.target_type}{log.target_id ? ` (${String(log.target_id).slice(0, 8)}...)` : ""}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted font-mono text-xs">{JSON.stringify(log.metadata).slice(0, 50)}{JSON.stringify(log.metadata).length > 50 ? "..." : ""}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-muted">No audit logs found.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted">Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {total} entries</p>
              <div className="flex gap-2">
                {page > 1 && (<Link href={`/admin/audit?page=${page - 1}`} className="min-h-10 items-center border border-white/20 px-4 text-sm font-bold transition-colors hover:border-coral hover:text-coral flex">Previous</Link>)}
                {page < totalPages && (<Link href={`/admin/audit?page=${page + 1}`} className="min-h-10 items-center border border-white/20 px-4 text-sm font-bold transition-colors hover:border-coral hover:text-coral flex">Next</Link>)}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
