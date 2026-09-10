import { useEffect, useMemo, useState } from "react";
import { Panel } from "../components/Panel";
import { StatusPill } from "../components/StatusPill";
import { GraphView } from "../components/GraphView";
import { PipelineStepper, type PipelineStep } from "../components/PipelineStepper";
import { api, type ApplyLogEntry, type EngineeringPlan, type GraphData } from "../services/api";
import { useProject } from "../services/ProjectContext";

const DEFAULT_REQUIREMENT =
  "Add a motor overview screen showing motor speed, temperature and overload status. " +
  "Add a high-temperature alarm and make the screen accessible from main navigation.";

interface ImpactState {
  node: string;
  status: "OK" | "UNKNOWN";
  affected_count?: number;
  affected?: { id: string; kind: string }[];
}

export function Engineering() {
  const { summary, validation, refreshProject, refreshValidation } = useProject();
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [requirement, setRequirement] = useState(DEFAULT_REQUIREMENT);
  const [plan, setPlan] = useState<EngineeringPlan | null>(null);
  const [mockMode, setMockMode] = useState<boolean | null>(null);
  const [log, setLog] = useState<ApplyLogEntry[] | null>(null);
  const [planning, setPlanning] = useState(false);
  const [applying, setApplying] = useState(false);
  const [impact, setImpact] = useState<ImpactState | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  const loadGraph = () => api.getGraph().then(setGraph).catch(() => {});

  useEffect(() => {
    loadGraph();
  }, [summary]);

  async function handlePlan() {
    setPlanning(true);
    setLog(null);
    try {
      const res = await api.plan(requirement);
      setPlan(res.plan);
      setMockMode(res.mock_mode);
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
      await loadGraph();
    } catch {
      /* toasted globally by api.ts */
    } finally {
      setApplying(false);
    }
  }

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

  const steps: PipelineStep[] = useMemo(
    () => [
      { id: "requirement", label: "Requirement", state: "done" },
      {
        id: "plan",
        label: "AI Plan",
        state: planning ? "active" : plan ? "done" : "idle",
      },
      {
        id: "generate",
        label: "Generate",
        state: applying ? "active" : log ? "done" : "idle",
      },
      {
        id: "validate",
        label: "Validate",
        state: !log ? "idle" : validation?.status === "PASS" ? "done" : validation?.status === "FAILED" ? "error" : "idle",
      },
    ],
    [planning, plan, applying, log, validation]
  );

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Engineering Pipeline" right={<span className="text-xs text-[var(--text-dim)]">requirement → AI plan → deterministic generation → validation</span>}>
        <PipelineStepper steps={steps} />
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel
          className="xl:col-span-2"
          title="Project Graph"
          right={<span className="text-xs text-[var(--text-dim)]">NetworkX-derived dependency graph — click a node for impact analysis</span>}
        >
          {graph ? (
            <GraphView graph={graph} onNodeClick={handleNodeClick} selectedNode={impact?.node} />
          ) : (
            <div className="text-[var(--text-dim)] text-sm">Loading graph...</div>
          )}
        </Panel>

        <Panel title="Change Impact Analysis" right={<span className="text-xs text-[var(--text-dim)]">graph traversal, no LLM</span>}>
          {!impact && !impactLoading && (
            <div className="text-sm text-[var(--text-dim)]">
              Click any node in the graph to see what tags, objects, screens or alarms depend on it.
            </div>
          )}
          {impactLoading && <div className="text-sm text-[var(--text-dim)]">Analyzing...</div>}
          {impact && !impactLoading && (
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium mono">{impact.node}</div>
              {impact.status === "UNKNOWN" ? (
                <div className="text-xs text-amber-400">Node not found in current graph.</div>
              ) : (
                <>
                  <div className="text-xs text-[var(--text-dim)]">
                    {impact.affected_count} connected node(s)
                  </div>
                  <div className="flex flex-col gap-1 max-h-64 overflow-auto">
                    {(impact.affected ?? []).map((a) => (
                      <div
                        key={a.id}
                        className="text-xs mono flex justify-between bg-[var(--panel-2)] rounded px-2 py-1 border border-[var(--border)]"
                      >
                        <span>{a.id}</span>
                        <span className="text-[var(--text-dim)]">{a.kind}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Engineering Requirement">
          <textarea
            className="w-full h-28 bg-[var(--panel-2)] border border-[var(--border)] rounded p-3 text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-[var(--text-dim)]">
              {mockMode === null
                ? "Planner mode shown after first plan"
                : mockMode
                ? "Mock planner (no LLM API key configured)"
                : "LLM-backed planner"}
            </span>
            <button
              className="relative overflow-hidden px-4 py-2 rounded bg-[var(--accent)] text-[#03121c] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50"
              onClick={handlePlan}
              disabled={planning || !requirement.trim()}
            >
              {planning ? "Generating..." : "Generate Engineering Plan"}
              {planning && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/50 anim-progress-bar w-1/3" />
              )}
            </button>
          </div>
        </Panel>

        <Panel title="Engineering Plan">
          {planning && (
            <div className="flex flex-col gap-2">
              <div className="h-4 w-3/4 rounded anim-shimmer" />
              <div className="h-8 w-full rounded anim-shimmer" style={{ animationDelay: "80ms" }} />
              <div className="h-8 w-full rounded anim-shimmer" style={{ animationDelay: "160ms" }} />
              <div className="h-8 w-5/6 rounded anim-shimmer" style={{ animationDelay: "240ms" }} />
            </div>
          )}
          {!plan && !planning && <div className="text-sm text-[var(--text-dim)]">No plan generated yet.</div>}
          {plan && !planning && (
            <div className="flex flex-col gap-3 anim-rise-in">
              <div className="text-sm text-[var(--text-dim)]">{plan.summary}</div>
              <div className="flex flex-col gap-1 max-h-56 overflow-auto">
                {plan.actions.map((a, i) => (
                  <div
                    key={i}
                    className="text-xs mono bg-[var(--panel-2)] rounded px-2 py-1.5 border border-[var(--border)] anim-rise-in transition-colors-smooth hover:border-[var(--accent)]/40"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <span className="text-[var(--accent)] font-semibold">{a.action}</span>{" "}
                    {a.screen && <span>screen={a.screen} </span>}
                    {a.object_type && <span>type={a.object_type} </span>}
                    {a.tag && <span>tag={a.tag} </span>}
                    {a.alarm && <span>alarm={a.alarm} threshold={a.threshold} </span>}
                    {a.from_screen && <span>{a.from_screen} → {a.to_screen} </span>}
                  </div>
                ))}
              </div>
              {plan.unknowns.length > 0 && (
                <div className="text-xs bg-amber-500/10 border border-amber-500/30 rounded p-2 text-amber-400 anim-rise-in">
                  UNKNOWN / requires engineer input: {plan.unknowns.join("; ")}
                </div>
              )}
              <button
                className="relative overflow-hidden px-4 py-2 rounded bg-emerald-500/90 text-[#03120b] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 self-start"
                onClick={handleApply}
                disabled={applying}
              >
                {applying ? "Applying..." : "Apply Plan (Generate HMI)"}
                {applying && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-white/50 anim-progress-bar w-1/3" />
                )}
              </button>
            </div>
          )}
        </Panel>
      </div>

      {log && (
        <Panel title="Generated Changes">
          <div className="flex flex-col gap-2">
            {log.map((entry, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm bg-[var(--panel-2)] rounded px-3 py-2 border border-[var(--border)] anim-rise-in transition-colors-smooth hover:border-[var(--accent)]/40"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span className="mono">{entry.action}</span>
                <div className="flex items-center gap-3">
                  {entry.reason && <span className="text-xs text-[var(--text-dim)]">{entry.reason}</span>}
                  <StatusPill status={entry.status} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
