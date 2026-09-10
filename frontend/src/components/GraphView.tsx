import { useMemo, type CSSProperties } from "react";
import type { GraphData } from "../services/api";

const KIND_ORDER = ["Screen", "Object", "Tag", "Alarm"];
const KIND_COLOR: Record<string, string> = {
  Screen: "#2fb3ff",
  Object: "#a78bfa",
  Tag: "#35c76a",
  Alarm: "#ff7043",
};

export function GraphView({
  graph,
  onNodeClick,
  selectedNode,
}: {
  graph: GraphData;
  onNodeClick?: (nodeId: string) => void;
  selectedNode?: string | null;
}) {
  const layout = useMemo(() => {
    const colWidth = 240;
    const rowHeight = 42;
    const colX: Record<string, number> = {};
    KIND_ORDER.forEach((k, i) => (colX[k] = 40 + i * colWidth));

    const positions: Record<string, { x: number; y: number; kind: string; label: string }> = {};
    KIND_ORDER.forEach((kind) => {
      const nodes = graph.nodes.filter((n) => n.kind === kind);
      nodes.forEach((n, i) => {
        positions[n.id] = {
          x: colX[kind],
          y: 30 + i * rowHeight,
          kind,
          label: (n as any).name || (n as any).label || n.id,
        };
      });
    });

    const maxRows = Math.max(
      1,
      ...KIND_ORDER.map((k) => graph.nodes.filter((n) => n.kind === k).length)
    );
    const height = 60 + maxRows * rowHeight;
    const width = 40 + KIND_ORDER.length * colWidth;

    return { positions, width, height, colX };
  }, [graph]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return null;
    const ids = new Set<string>([selectedNode]);
    graph.edges.forEach((e) => {
      if (e.source === selectedNode) ids.add(e.target);
      if (e.target === selectedNode) ids.add(e.source);
    });
    return ids;
  }, [graph.edges, selectedNode]);

  // key changes whenever the graph structure changes (e.g. after "Apply Plan"
  // adds a screen), so the draw-in animation replays to show what's new.
  const graphKey = `${graph.nodes.length}-${graph.edges.length}`;

  return (
    <div className="overflow-auto">
      <svg key={graphKey} width={layout.width} height={layout.height} className="min-w-full">
        {KIND_ORDER.map((k) => (
          <text key={k} x={layout.colX[k]} y={16} fill={KIND_COLOR[k]} fontSize={11} fontWeight={700}>
            {k.toUpperCase()}
          </text>
        ))}
        {graph.edges.map((e, i) => {
          const s = layout.positions[e.source];
          const t = layout.positions[e.target];
          if (!s || !t) return null;
          const x1 = s.x + 90;
          const y1 = s.y + 10;
          const x2 = t.x;
          const y2 = t.y + 10;
          const len = Math.hypot(x2 - x1, y2 - y1);
          const highlighted =
            connectedNodeIds && connectedNodeIds.has(e.source) && connectedNodeIds.has(e.target);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={highlighted ? "var(--accent)" : "#2a3a4a"}
              strokeWidth={highlighted ? 2.2 : 1.5}
              opacity={connectedNodeIds && !highlighted ? 0.25 : 1}
              className="anim-draw transition-all duration-300"
              style={{ "--line-len": len, animationDelay: `${Math.min(i * 12, 400)}ms` } as CSSProperties}
            />
          );
        })}
        {Object.entries(layout.positions).map(([id, p], i) => {
          const dimmed = connectedNodeIds && !connectedNodeIds.has(id);
          return (
            <g
              key={id}
              onClick={() => onNodeClick?.(id)}
              className="anim-pop-in transition-opacity duration-300"
              style={{
                cursor: onNodeClick ? "pointer" : "default",
                animationDelay: `${Math.min(i * 20, 300)}ms`,
                opacity: dimmed ? 0.35 : 1,
              }}
            >
              <rect
                x={p.x}
                y={p.y}
                width={180}
                height={22}
                rx={4}
                fill={selectedNode === id ? `${KIND_COLOR[p.kind]}33` : "#16202c"}
                stroke={KIND_COLOR[p.kind]}
                strokeWidth={selectedNode === id ? 2.5 : 1}
                className="transition-all duration-200"
              >
                {onNodeClick && (
                  <title>{`${p.label} (${p.kind}) — click for impact analysis`}</title>
                )}
              </rect>
              <text x={p.x + 8} y={p.y + 15} fontSize={11} fill="#e4ecf3">
                {String(p.label).slice(0, 24)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
