import { Panel } from "../components/Panel";
import { useProject } from "../services/ProjectContext";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-[var(--text-dim)]">{label}</span>
      <span className="text-2xl font-semibold mono">{value}</span>
    </div>
  );
}

export function Dashboard() {
  const { summary, validation, approved, loading } = useProject();

  if (loading || !summary) {
    return <div className="text-[var(--text-dim)]">Loading project...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Project">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{summary.project_name}</div>
            <div className="text-xs text-[var(--text-dim)] mt-1">
              Neutral HMI engineering project representation (not a native EOTE export)
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-dim)]">Engineering status</span>
            <span className="px-2 py-0.5 rounded text-xs font-semibold border bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40">
              {approved ? "APPROVED" : "IN PROGRESS"}
            </span>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Tags" value={summary.tag_count} />
        <Stat label="Screens" value={summary.screen_count} />
        <Stat label="Objects" value={summary.object_count} />
        <Stat label="Alarms" value={summary.alarm_count} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="Validation Status">
          {validation ? (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Overall</span>
                <span className={validation.status === "PASS" ? "text-emerald-400" : "text-red-400"}>
                  {validation.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Structural issues</span>
                <span>{validation.summary.structural_issue_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-dim)]">Simulation scenarios passed</span>
                <span>
                  {validation.summary.scenarios_passed}/{validation.summary.scenarios_total}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[var(--text-dim)] text-sm">No validation run yet</div>
          )}
        </Panel>

        <Panel title="Engineering Structure">
          <div className="flex flex-col gap-2 text-sm">
            <div>
              <span className="text-[var(--text-dim)]">Screens: </span>
              {summary.screens.join(", ")}
            </div>
            <div>
              <span className="text-[var(--text-dim)]">Alarms: </span>
              {summary.alarms.join(", ")}
            </div>
            <div>
              <span className="text-[var(--text-dim)]">Tags: </span>
              {summary.tags.join(", ")}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
