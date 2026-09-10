import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Panel } from "../components/Panel";
import { StatusPill } from "../components/StatusPill";
import { GraphView } from "../components/GraphView";
import { api, type ApplyLogEntry, type EngineeringPlan, type GraphData } from "../services/api";
import { useProject } from "../services/ProjectContext";

interface ImpactState {
  node: string;
  kind?: string;
  status: "OK" | "UNKNOWN";
  affected_count?: number;
  depends_on_this?: { id: string; kind: string }[];
  this_depends_on?: { id: string; kind: string }[];
}

const KIND_COLOR: Record<string, string> = {
  Screen: "#2fb3ff",
  Object: "#a78bfa",
  Tag: "#35c76a",
  Alarm: "#ff7043",
};

function KindBadge({ kind }: { kind: string }) {
  const color = KIND_COLOR[kind] ?? "#8fa3b5";
  return (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded border"
      style={{ color, borderColor: `${color}55`, background: `${color}14` }}
    >
      {kind}
    </span>
  );
}

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

export function ProjectGraph() {
  const navigate = useNavigate();
  const {
    summary,
    buildLog,
    correction,
    graphApproved,
    setGraphApproved,
    refreshProject,
    refreshValidation,
    pushActivity,
    advanceStage,
  } = useProject();
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [impact, setImpact] = useState<ImpactState | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [refinePlan, setRefinePlan] = useState<EngineeringPlan | null>(null);
  const [refineLog, setRefineLog] = useState<ApplyLogEntry[] | null>(null);
  const [planning, setPlanning] = useState(false);
  const [applying, setApplying] = useState(false);

  const loadGraph = () => api.getGraph().then(setGraph).catch(() => {});

  useEffect(() => {
    loadGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  async function handleNodeClick(nodeId: string) {
    setImpactLoading(true);
    setImpact(null);
    try {
      const res = await api.getImpact(nodeId);
      setImpact(res);
    } catch {
      /* toasted globally by api.ts */
    } finally {
      setImpactLoading(false);
    }
  }

  const impactNodeIds = useMemo(() => {
    if (!impact || impact.status !== "OK") return null;
    const ids = new Set<string>([impact.node]);
    (impact.depends_on_this ?? []).forEach((d) => ids.add(d.id));
    (impact.this_depends_on ?? []).forEach((d) => ids.add(d.id));
    return ids;
  }, [impact]);

  async function handleRefinePlan() {
    if (!followUp.trim()) return;
    setPlanning(true);
    setRefineLog(null);
    try {
      const res = await api.plan(followUp);
      setRefinePlan(res.plan);
    } catch {
      /* toasted globally by api.ts */
    } finally {
      setPlanning(false);
    }
  }

  async function handleApplyRefinement() {
    if (!refinePlan) return;
    setApplying(true);
    try {
      const res = await api.apply(refinePlan);
      setRefineLog(res.log);
      await refreshProject();
      await refreshValidation();
      loadGraph();
      const appliedCount = res.log.filter((l) => l.status === "APPLIED").length;
      pushActivity(
        "generate",
        `Engineer refinement applied: ${appliedCount}/${res.log.length} action(s) -- "${followUp.slice(0, 60)}${followUp.length > 60 ? "..." : ""}"`
      );
      setFollowUp("");
      setRefinePlan(null);
    } catch {
      /* toasted globally by api.ts */
    } finally {
      setApplying(false);
    }
  }

  function handleApproveGraph() {
    setGraphApproved(true);
    advanceStage(5);
    pushActivity("manual", "Engineer approved the project graph");
    navigate("/workspace/hmi");
  }

  return (
    <div className="flex flex-col gap-6">
      {buildLog && (
        <Panel
          title="Build Summary"
          right={<span className="text-xs text-[var(--text-dim)]">tags, screens, alarms and navigation generated from the approved plan</span>}
        >
          <ApplyLog log={buildLog} />
        </Panel>
      )}

      {correction && (
        <Panel title="AI Self-Correction" right={<StatusPill status={correction.final_status} />}>
          <div className="text-sm text-[var(--text-dim)] mb-2">
            Validation found issues right after generation -- the autopilot diagnosed and fixed them automatically.
          </div>
          <div className="flex flex-col gap-2">
            {correction.cycles.map((cycle) => (
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
        title="Project Graph"
        right={
          <span className="text-xs text-[var(--text-dim)]">
            Machine → Asset → Tag → HMI Object → Screen → Alarm, derived live from the project (NetworkX)
          </span>
        }
      >
        <p className="text-xs text-[var(--text-dim)] mb-3">
          Every relationship here comes directly from the parsed project -- no fabricated connections. Click
          any node to trace exactly what it depends on and what would be affected if it changed.
        </p>
        {graph ? (
          <GraphView graph={graph} onNodeClick={handleNodeClick} selectedNode={impact?.node} impactNodeIds={impactNodeIds} />
        ) : (
          <div className="text-[var(--text-dim)] text-sm">Loading graph...</div>
        )}
      </Panel>

      <Panel
        title="Change Impact Analysis"
        right={<span className="text-xs text-[var(--text-dim)]">graph traversal (NetworkX ancestors/descendants), no LLM</span>}
      >
        {!impact && !impactLoading && (
          <div className="text-sm text-[var(--text-dim)]">
            Click any node in the graph above to see its dependency chain and what it would affect if changed.
          </div>
        )}
        {impactLoading && (
          <div className="flex flex-col gap-2">
            <div className="h-5 w-1/3 rounded anim-shimmer" />
            <div className="h-16 w-full rounded anim-shimmer" style={{ animationDelay: "80ms" }} />
          </div>
        )}
        {impact && !impactLoading && (
          <div className="anim-rise-in flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold mono">{impact.node}</span>
              {impact.kind && <KindBadge kind={impact.kind} />}
            </div>

            {impact.status === "UNKNOWN" ? (
              <div className="text-xs text-amber-400">Node not found in current graph.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-2">
                    ↓ This depends on ({(impact.this_depends_on ?? []).length})
                  </div>
                  {(impact.this_depends_on ?? []).length === 0 ? (
                    <div className="text-xs text-[var(--text-dim)]">Nothing -- this is a leaf/source node.</div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {(impact.this_depends_on ?? []).map((d, i) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between text-xs mono bg-[var(--panel-2)] rounded px-2 py-1.5 border border-[var(--border)] anim-rise-in"
                          style={{ animationDelay: `${i * 40}ms`, marginLeft: 8 }}
                        >
                          <span>{d.id}</span>
                          <KindBadge kind={d.kind} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
                    ↑ Would be affected if this changes ({(impact.depends_on_this ?? []).length})
                  </div>
                  {(impact.depends_on_this ?? []).length === 0 ? (
                    <div className="text-xs text-[var(--text-dim)]">Nothing else references this node.</div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {(impact.depends_on_this ?? []).map((d, i) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between text-xs mono bg-red-500/5 rounded px-2 py-1.5 border border-red-500/20 anim-rise-in"
                          style={{ animationDelay: `${i * 40}ms` }}
                        >
                          <span>{d.id}</span>
                          <KindBadge kind={d.kind} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Panel>

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
            onClick={handleRefinePlan}
            disabled={planning || !followUp.trim()}
          >
            {planning ? "Thinking..." : "Generate Change Plan"}
            {planning && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/50 anim-progress-bar w-1/3" />}
          </button>
        </div>

        {refinePlan && (
          <div className="mt-4 flex flex-col gap-3 anim-rise-in border-t border-[var(--border)] pt-4">
            <PlanActions plan={refinePlan} />
            <button
              className="relative overflow-hidden px-4 py-2 rounded bg-emerald-500/90 text-[#03120b] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 self-start"
              onClick={handleApplyRefinement}
              disabled={applying}
            >
              {applying ? "Applying..." : "Apply Change"}
              {applying && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/50 anim-progress-bar w-1/3" />}
            </button>
          </div>
        )}

        {refineLog && (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            <ApplyLog log={refineLog} />
          </div>
        )}
      </Panel>

      <div className="flex justify-end">
        <button
          onClick={handleApproveGraph}
          className="px-5 py-2.5 rounded bg-emerald-500/90 text-[#03120b] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 flex items-center gap-2"
        >
          {graphApproved && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {graphApproved ? "Re-approved -- Continue to Simulation →" : "Approve Project Graph → Continue to Simulation"}
        </button>
      </div>
    </div>
  );
}
