import { useMemo } from "react";
import type { GraphData } from "../services/api";

const KIND_ORDER = ["Screen", "Object", "Tag", "Alarm"];
const KIND_COLOR: Record<string, string> = {
  Screen: "#2fb3ff",
  Object: "#a78bfa",
  Tag: "#35c76a",
  Alarm: "#ff7043",
};

export function GraphView({ graph }: { graph: GraphData }) {
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

  return (
    <div className="overflow-auto">
      <svg width={layout.width} height={layout.height} className="min-w-full">
        {KIND_ORDER.map((k) => (
          <text key={k} x={layout.colX[k]} y={16} fill={KIND_COLOR[k]} fontSize={11} fontWeight={700}>
            {k.toUpperCase()}
          </text>
        ))}
        {graph.edges.map((e, i) => {
          const s = layout.positions[e.source];
          const t = layout.positions[e.target];
          if (!s || !t) return null;
          return (
            <line
              key={i}
              x1={s.x + 90}
              y1={s.y + 10}
              x2={t.x}
              y2={t.y + 10}
              stroke="#2a3a4a"
              strokeWidth={1.5}
            />
          );
        })}
        {Object.entries(layout.positions).map(([id, p]) => (
          <g key={id}>
            <rect
              x={p.x}
              y={p.y}
              width={180}
              height={22}
              rx={4}
              fill="#16202c"
              stroke={KIND_COLOR[p.kind]}
              strokeWidth={1}
            />
            <text x={p.x + 8} y={p.y + 15} fontSize={11} fill="#e4ecf3">
              {String(p.label).slice(0, 24)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
