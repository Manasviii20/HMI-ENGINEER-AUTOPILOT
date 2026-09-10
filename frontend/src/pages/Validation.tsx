import { useState } from "react";
import { Panel } from "../components/Panel";
import { StatusPill } from "../components/StatusPill";
import { api, type SelfCorrectionResult } from "../services/api";
import { useProject } from "../services/ProjectContext";

export function Validation() {
  const { validation, refreshValidation, refreshProject } = useProject();
  const [breaking, setBreaking] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [correction, setCorrection] = useState<SelfCorrectionResult | null>(null);

  async function handleBreakBinding() {
    setBreaking(true);
    setCorrection(null);
    try {
      await api.breakBinding("obj_motor_overview_gauge");
    } catch {
      /* object may not exist yet if plan not applied */
    }
    await refreshValidation();
    setBreaking(false);
  }

  async function handleAutofix() {
    setFixing(true);
    try {
      const res = await api.autofix();
      setCorrection(res);
      await refreshValidation();
      await refreshProject();
    } finally {
      setFixing(false);
    }
  }

  async function handleRevalidate() {
    await refreshValidation();
  }

  if (!validation) return <div className="text-[var(--text-dim)]">Loading validation...</div>;

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Validation Suite"
        right={
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-dim)]">Overall status</span>
            <StatusPill status={validation.status} />
          </div>
        }
      >
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-[var(--text-dim)] text-xs">Structural issues</div>
            <div className="text-lg mono">{validation.summary.structural_issue_count}</div>
          </div>
          <div>
            <div className="text-[var(--text-dim)] text-xs">Scenario tests passed</div>
            <div className="text-lg mono">
              {validation.summary.scenarios_passed}/{validation.summary.scenarios_total}
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleBreakBinding}
              disabled={breaking}
              className="px-3 py-1.5 rounded text-xs font-semibold border border-red-500/40 text-red-400 hover:bg-red-500/10"
            >
              {breaking ? "Injecting..." : "Inject Broken Binding"}
            </button>
            <button
              onClick={handleRevalidate}
              className="px-3 py-1.5 rounded text-xs font-semibold border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)]"
            >
              Re-run Validation
            </button>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Structural Issues">
          {validation.structural_issues.length === 0 ? (
            <div className="text-sm text-emerald-400">No structural issues detected</div>
          ) : (
            <div className="flex flex-col gap-2">
              {validation.structural_issues.map((issue) => (
                <div key={issue.id} className="text-sm bg-[var(--panel-2)] rounded p-2 border border-red-500/30">
                  <div className="flex justify-between">
                    <span className="font-semibold text-red-400">{issue.type}</span>
                    <span className="text-xs text-[var(--text-dim)]">{issue.severity}</span>
                  </div>
                  <div className="text-xs text-[var(--text-dim)] mt-1">{issue.message}</div>
                </div>
              ))}
            </div>
          )}
          {validation.status !== "PASS" && (
            <button
              onClick={handleAutofix}
              disabled={fixing}
              className="mt-4 px-4 py-2 rounded bg-[var(--accent)] text-[#03121c] font-semibold text-sm hover:opacity-90 disabled:opacity-50"
            >
              {fixing ? "AI analyzing and fixing..." : "Run AI Auto-Fix"}
            </button>
          )}
        </Panel>

        <Panel title="Simulation Scenario Tests">
          <div className="flex flex-col gap-2">
            {validation.scenario_results.map((r) => (
              <div key={r.scenario} className="flex items-center justify-between text-sm bg-[var(--panel-2)] rounded px-3 py-2 border border-[var(--border)]">
                <span className="mono">{r.scenario}</span>
                <div className="flex items-center gap-2">
                  {r.issues.length > 0 && (
                    <span className="text-xs text-red-400">{r.issues.join("; ")}</span>
                  )}
                  <StatusPill status={r.status} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {correction && (
        <Panel title="Self-Correction Log" right={<StatusPill status={correction.final_status} />}>
          <div className="flex flex-col gap-3">
            {correction.cycles.map((cycle) => (
              <div key={cycle.cycle} className="border border-[var(--border)] rounded p-3">
                <div className="text-xs text-[var(--text-dim)] mb-2">
                  Cycle {cycle.cycle} — <StatusPill status={cycle.status} />
                </div>
                {cycle.actions.length === 0 ? (
                  <div className="text-xs text-[var(--text-dim)]">No corrections needed</div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {cycle.actions.map((a, i) => (
                      <div key={i} className="text-xs mono flex justify-between bg-[var(--panel-2)] rounded px-2 py-1">
                        <span>
                          {a.action} {(a as any).object ?? (a as any).issue ?? ""} {(a as any).tag ? `→ ${(a as any).tag}` : ""}
                        </span>
                        <StatusPill status={a.status} />
                      </div>
                    ))}
                    {cycle.actions.map((a, i) =>
                      a.reason ? (
                        <div key={`r${i}`} className="text-[10px] text-[var(--text-dim)] pl-2">
                          {a.reason}
                        </div>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
