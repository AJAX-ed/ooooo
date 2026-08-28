import Link from "next/link";

export default function VolunteerPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 text-paper">
      <section className="w-full max-w-lg border border-white/10 bg-panel p-8 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-coral">RegDesk / Volunteer</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">Volunteer access</h1>
        <p className="mt-4 leading-7 text-muted">Google authentication and the offline scanning workspace arrive in the next implementation phase.</p>
        <Link className="mt-8 inline-flex min-h-11 items-center border border-white/20 px-5 text-sm font-bold transition-colors hover:border-coral hover:text-coral" href="/">Back to overview</Link>
      </section>
    </main>
  );
}