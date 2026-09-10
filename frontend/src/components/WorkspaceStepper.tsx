import { NavLink } from "react-router-dom";

export type StageStatus = "done" | "active" | "pending" | "attention";

export interface WorkspaceStage {
  n: string;
  path: string;
  label: string;
  status: StageStatus;
  clickable?: boolean;
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

/** Horizontal 7-stage engineering-journey stepper (Input -> Understand -> Plan
 * -> Build -> Simulate -> Validate -> Export). A stage is only clickable once
 * the journey has reached it -- the product should never let the engineer
 * jump ahead of an unapproved checkpoint, but every stage already reached
 * stays freely revisitable. */
export function WorkspaceStepper({ stages }: { stages: WorkspaceStage[] }) {
  return (
    <nav className="flex gap-1 px-6 py-2 border-b border-[var(--border)] bg-[var(--panel-2)] overflow-x-auto">
      {stages.map((s) => {
        const inner = (
          <>
            <span className="mono text-[10px] opacity-60">{s.n}</span>
            <span style={{ color: COLOR[s.status] }} className={s.status === "active" ? "anim-pulse" : ""}>
              {ICON[s.status]}
            </span>
            {s.label}
          </>
        );

        if (s.clickable === false) {
          return (
            <span
              key={s.path}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap text-[var(--text-dim)] opacity-40 cursor-not-allowed"
            >
              {inner}
            </span>
          );
        }

        return (
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
            {inner}
          </NavLink>
        );
      })}
    </nav>
  );
}
