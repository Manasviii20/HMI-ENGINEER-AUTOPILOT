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
  const pulse = status === "FAILED" || status === "REJECTED" || status === "CORRECTING";
  return (
    <span
      key={status}
      className={`px-2 py-0.5 rounded text-xs font-semibold border tracking-wide transition-colors-smooth anim-pop-in inline-flex items-center gap-1.5 ${
        map[status] ?? "bg-slate-500/15 text-slate-300 border-slate-500/40"
      }`}
    >
      <span className={`status-dot ${pulse ? "anim-flash" : status === "PASS" || status === "APPLIED" || status === "APPROVED" ? "anim-pulse" : ""}`} style={{ width: 6, height: 6, background: "currentColor" }} />
      {status}
    </span>
  );
}
