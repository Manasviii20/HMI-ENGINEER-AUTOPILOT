export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PASS: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
    FAILED: "bg-red-500/15 text-red-400 border-red-500/40",
    APPLIED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
    REJECTED: "bg-red-500/15 text-red-400 border-red-500/40",
    SKIPPED: "bg-amber-500/15 text-amber-400 border-amber-500/40",
    APPROVED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
    CORRECTING: "bg-amber-500/15 text-amber-400 border-amber-500/40",
    REQUIRES_ENGINEER_INPUT: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-semibold border tracking-wide ${
        map[status] ?? "bg-slate-500/15 text-slate-300 border-slate-500/40"
      }`}
    >
      {status}
    </span>
  );
}
