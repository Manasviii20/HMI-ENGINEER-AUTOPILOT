import { NavLink } from "react-router-dom";

export type StageStatus = "done" | "active" | "pending" | "attention";

export interface WorkspaceStage {
  n: string;
  path: string;
  label: string;
  status: StageStatus;
}

const ICON: Record<StageStatus, string> = {
  done: "✓",
  active: "●",
  pending: "○",
  attention: "⚠",
};

const COLOR: Record<StageStatus, string> = {
  done: "var(--ok)",
  active: "var(--accent)",
  pending: "var(--text-dim)",
  attention: "var(--crit)",
};

/** Horizontal engineering-lifecycle stepper. Every stage is always
 * click-through -- the product should never force a blind "Next" click, the
 * stage's own page renders its current state (including "not ready yet"). */
export function WorkspaceStepper({ stages }: { stages: WorkspaceStage[] }) {
  return (
    <nav className="flex gap-1 px-6 py-2 border-b border-[var(--border)] bg-[var(--panel-2)] overflow-x-auto">
      {stages.map((s) => (
        <NavLink
          key={s.path}
          to={s.path}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              isActive
                ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--accent)]/5"
            }`
          }
        >
          <span className="mono text-[10px] opacity-60">{s.n}</span>
          <span style={{ color: COLOR[s.status] }} className={s.status === "active" ? "anim-pulse" : ""}>
            {ICON[s.status]}
          </span>
          {s.label}
        </NavLink>
      ))}
    </nav>
  );
}
