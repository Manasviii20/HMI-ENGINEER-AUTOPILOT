import { useState } from "react";
import { Link } from "react-router-dom";
import { Panel } from "../components/Panel";
import { StatusPill } from "../components/StatusPill";
import { api, type ApplyLogEntry, type EngineeringPlan } from "../services/api";
import { useProject } from "../services/ProjectContext";

function PlanActions({ plan }: { plan: EngineeringPlan }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-sm text-[var(--text-dim)]">{plan.summary}</div>
      <div className="flex flex-col gap-1 max-h-56 overflow-auto">
        {plan.actions.map((a, i) => (
          <div
            key={i}
            className="text-xs mono bg-[var(--panel-2)] rounded px-2 py-1.5 border border-[var(--border)] anim-rise-in transition-colors-smooth hover:border-[var(--accent)]/40"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="text-emerald-400 font-semibold">+ {a.action}</span>{" "}
            {a.screen && <span>screen={a.screen} </span>}
            {a.object_type && <span>type={a.object_type} </span>}
            {a.tag && <span>&rarr; tag={a.tag} </span>}
            {a.alarm && <span>alarm="{a.alarm}" threshold={a.threshold} </span>}
            {a.from_screen && (
              <span>
                {a.from_screen} &rarr; {a.to_screen}{" "}
              </span>
            )}
          </div>
        ))}
      </div>
      {plan.unknowns.length > 0 && (
        <div className="text-xs bg-amber-500/10 border border-amber-500/30 rounded p-2 text-amber-400 anim-rise-in">
          UNKNOWN / requires engineer input: {plan.unknowns.join("; ")}
        </div>
      )}
    </div>
  );
}

function ApplyLog({ log }: { log: ApplyLogEntry[] }) {
  return (
    <div className="flex flex-col gap-2">
      {log.map((entry, i) => (
        <div
          key={i}
          className="flex items-center justify-between text-sm bg-[var(--panel-2)] rounded px-3 py-2 border border-[var(--border)] anim-rise-in transition-colors-smooth hover:border-[var(--accent)]/40"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          <span className="mono">{entry.action}</span>
          <div className="flex items-center gap-3">
            {entry.reason && <span className="text-xs text-[var(--text-dim)]">{entry.reason}</span>}
            <StatusPill status={entry.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Engineering() {
  const { autopilotResult, refreshProject, refreshValidation, pushActivity } = useProject();
  const [followUp, setFollowUp] = useState("");
  const [plan, setPlan] = useState<EngineeringPlan | null>(null);
  const [log, setLog] = useState<ApplyLogEntry[] | null>(null);
  const [planning, setPlanning] = useState(false);
  const [applying, setApplying] = useState(false);

  async function handlePlan() {
    if (!followUp.trim()) return;
    setPlanning(true);
    setLog(null);
    try {
      const res = await api.plan(followUp);
      setPlan(res.plan);
    } catch {
      /* toasted globally by api.ts */
    } finally {
      setPlanning(false);
    }
  }

  async function handleApply() {
    if (!plan) return;
    setApplying(true);
    try {
      const res = await api.apply(plan);
      setLog(res.log);
      await refreshProject();
      await refreshValidation();
      const appliedCount = res.log.filter((l) => l.status === "APPLIED").length;
      pushActivity(
        "generate",
        `Engineer refinement applied: ${appliedCount}/${res.log.length} action(s) -- "${followUp.slice(0, 60)}${followUp.length > 60 ? "..." : ""}"`
      );
      setFollowUp("");
      setPlan(null);
    } catch {
      /* toasted globally by api.ts */
    } finally {
      setApplying(false);
    }
  }

  if (!autopilotResult) {
    return <div className="text-[var(--text-dim)] text-sm">Loading engineering result...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Requirement Received"
        right={<span className="text-xs text-[var(--text-dim)]">{autopilotResult.mock_mode ? "Mock planner" : "LLM-backed planner"}</span>}
      >
        <div className="text-sm">{autopilotResult.requirement}</div>
      </Panel>

      <Panel
        title="AI Engineering Plan"
        right={
          <Link to="/workspace/model" className="text-xs text-[var(--accent)] hover:underline">
            View Project Model &rarr;
          </Link>
        }
      >
        <PlanActions plan={autopilotResult.plan} />
      </Panel>

      <Panel title="Generated Changes">
        <ApplyLog log={autopilotResult.apply_log} />
      </Panel>

      {autopilotResult.correction && (
        <Panel title="AI Self-Correction">
          <div className="text-sm text-[var(--text-dim)] mb-2">
            Validation found issues after generation -- the autopilot diagnosed and fixed them automatically before
            handing the project to you.
          </div>
          <div className="flex flex-col gap-2">
            {autopilotResult.correction.cycles.map((cycle) => (
              <div key={cycle.cycle} className="text-xs bg-[var(--panel-2)] rounded px-3 py-2 border border-[var(--border)]">
                <span className="font-semibold">Cycle {cycle.cycle}:</span> {cycle.status}
                {cycle.actions.length > 0 && (
                  <ul className="mt-1 ml-4 list-disc">
                    {cycle.actions.map((a, i) => (
                      <li key={i} className="mono">
                        {JSON.stringify(a)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel
        title="Engineer Refinement"
        right={<span className="text-xs text-[var(--text-dim)]">describe a change -- the AI updates the model</span>}
      >
        <textarea
          className="w-full h-20 bg-[var(--panel-2)] border border-[var(--border)] rounded p-3 text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
          placeholder='e.g. "Add an alarm when temperature exceeds 80C" or "Move speed and temperature onto the same motor card."'
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
        />
        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            className="relative overflow-hidden px-4 py-2 rounded bg-[var(--accent)] text-[#03121c] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50"
            onClick={handlePlan}
            disabled={planning || !followUp.trim()}
          >
            {planning ? "Thinking..." : "Generate Change Plan"}
            {planning && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/50 anim-progress-bar w-1/3" />}
          </button>
        </div>

        {plan && (
          <div className="mt-4 flex flex-col gap-3 anim-rise-in border-t border-[var(--border)] pt-4">
            <PlanActions plan={plan} />
            <button
              className="relative overflow-hidden px-4 py-2 rounded bg-emerald-500/90 text-[#03120b] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 self-start"
              onClick={handleApply}
              disabled={applying}
            >
              {applying ? "Applying..." : "Apply Change"}
              {applying && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/50 anim-progress-bar w-1/3" />}
            </button>
          </div>
        )}

        {log && (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <ApplyLog log={log} />
          </div>
        )}
      </Panel>
    </div>
  );
}
