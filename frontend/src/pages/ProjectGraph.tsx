import { useEffect, useMemo, useState } from "react";
import { Panel } from "../components/Panel";
import { GraphView } from "../components/GraphView";
import { api, type GraphData } from "../services/api";
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

export function ProjectGraph() {
  const { summary } = useProject();
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [impact, setImpact] = useState<ImpactState | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

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

  return (
    <div className="flex flex-col gap-6">
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
    </div>
  );
}
