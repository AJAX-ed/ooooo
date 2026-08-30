import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkVolunteerAuth } from "@/lib/auth/volunteer";

interface SearchParams {
  search?: string;
  page?: string;
}

async function getParticipants(search?: string, page: number = 1) {
  const supabase = await createSupabaseServerClient();
  const pageSize = 50;
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  let query = supabase
    .from("participants")
    .select("id, registration_number, full_name, email, created_at", { count: "exact" })
    .range(start, end)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `registration_number.ilike.%${search}%,full_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching participants:", error);
    return { participants: [], total: 0, totalPages: 0 };
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  return {
    participants: data || [],
    total: count || 0,
    totalPages
  };
}

export default async function ParticipantsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const authResult = await checkVolunteerAuth();
  
  if (!authResult.isAuthenticated || !authResult.isAdmin) {
    redirect("/volunteer?status=unauthorized");
  }

  const params = await searchParams;
  const search = params.search;
  const page = params.page ? parseInt(params.page, 10) : 1;
  
  const { participants, total, totalPages } = await getParticipants(search, page);

  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* Header */}
      <header className="border-b border-white/10 bg-panel">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-coral text-sm font-black tracking-tight text-ink">RD</div>
                <div>
                  <p className="text-sm font-bold tracking-[0.18em] text-paper">REGDESK</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted">Admin Console</p>
                </div>
              </Link>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="min-h-10 items-center border border-white/20 px-4 text-xs font-bold uppercase tracking-wider transition-colors hover:border-coral hover:text-coral flex">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Navigation */}
        <nav className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
          {[
            { href: "/admin", label: "Dashboard" },
            { href: "/admin/participants", label: "Participants", active: true },
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

        {/* Page Content */}
        <main>
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-black tracking-tight">Participants</h1>
            <p className="text-sm text-muted">{total} total participants</p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <form className="flex gap-3">
              <input
                type="text"
                name="search"
                placeholder="Search by registration number, name, or email..."
                defaultValue={search}
                className="flex-1 rounded-md border border-white/20 bg-panel px-4 py-2 text-sm text-paper placeholder-muted focus:border-coral focus:outline-none"
              />
              <button
                type="submit"
                className="min-h-10 items-center bg-coral px-5 text-sm font-bold text-ink transition-colors hover:bg-paper flex"
              >
                Search
              </button>
              {search && (
                <Link
                  href="/admin/participants"
                  className="min-h-10 items-center border border-white/20 px-4 text-sm font-bold transition-colors hover:border-coral hover:text-coral flex"
                >
                  Clear
                </Link>
              )}
            </form>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-panel">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Registration #</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Full Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {participants.length > 0 ? (
                  participants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-white/5">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-paper">{participant.registration_number}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">{participant.full_name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">{participant.email}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">
                        {new Date(participant.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted">
                      {search ? "No participants found matching your search." : "No participants yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted">
                Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {total} participants
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/participants?page=${page - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                    className="min-h-10 items-center border border-white/20 px-4 text-sm font-bold transition-colors hover:border-coral hover:text-coral flex"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/participants?page=${page + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                    className="min-h-10 items-center border border-white/20 px-4 text-sm font-bold transition-colors hover:border-coral hover:text-coral flex"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
