export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-[var(--card-border)] bg-white/80 px-8 py-6 shadow-[var(--glow)]">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        <p className="text-sm font-medium text-slate-600">Loading travel intel…</p>
      </div>
    </div>
  );
}
