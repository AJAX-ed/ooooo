export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-coral text-sm font-black tracking-tight text-ink">RD</div>
            <div>
              <p className="text-sm font-bold tracking-[0.18em] text-paper">REGDESK</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted">CYSCOM x FYI</p>
            </div>
          </div>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-muted sm:block">Event operations / 01</span>
        </header>

        <section className="grid flex-1 items-center gap-14 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:py-24">
          <div className="max-w-3xl">
            <p className="mb-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-coral"><span className="h-2 w-2 rounded-full bg-coral" />Event day command center</p>
            <h1 className="max-w-2xl text-5xl font-black leading-[0.96] tracking-tight text-paper sm:text-7xl">Every arrival.<br /><span className="text-coral">Counted.</span></h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-muted">A resilient registration desk for participant passes, team building, and three-point attendance tracking, even when the network gets patchy.</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a className="inline-flex min-h-12 items-center justify-center bg-coral px-6 text-sm font-bold text-ink transition-colors hover:bg-paper" href="/volunteer">Volunteer access<span className="ml-3 text-lg" aria-hidden="true">-&gt;</span></a>
              <a className="inline-flex min-h-12 items-center justify-center border border-white/20 px-6 text-sm font-bold text-paper transition-colors hover:border-coral hover:text-coral" href="/admin">Admin console</a>
            </div>
          </div>

          <div className="relative border border-white/10 bg-panel p-6 sm:p-8">
            <div className="absolute right-0 top-0 h-24 w-24 border-b border-l border-coral/40" />
            <div className="flex items-center justify-between border-b border-white/10 pb-5">
              <div><p className="text-xs uppercase tracking-[0.18em] text-muted">System status</p><p className="mt-2 text-xl font-bold text-paper">Ready for Phase 1</p></div>
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mint"><span className="h-2 w-2 rounded-full bg-mint" />Online</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-white/10">
              {[["500", "participant capacity"], ["03", "attendance points"], ["PWA", "offline ready"], ["RLS", "data protected"]].map(([value, label]) => <div className="bg-panel p-5" key={label}><p className="text-2xl font-black text-paper">{value}</p><p className="mt-1 text-[11px] uppercase leading-4 tracking-wider text-muted">{label}</p></div>)}
            </div>
            <p className="mt-6 border-l-2 border-coral pl-4 text-sm leading-6 text-muted">Supabase is the source of truth. Devices keep the desk moving locally and sync safely when connectivity returns.</p>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/10 py-5 text-[11px] uppercase tracking-[0.16em] text-muted sm:flex-row sm:items-center sm:justify-between"><span>CYSCOM x FYI / Registration desk</span><span>Secure by design / Built for the floor</span></footer>
      </div>
    </main>
  );
}
