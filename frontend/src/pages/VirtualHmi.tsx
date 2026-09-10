import { useEffect, useRef, useState } from "react";
import { Panel } from "../components/Panel";
import { api, simulationSocket, type SimulationConnection } from "../services/api";
import { useProject } from "../services/ProjectContext";

const SCENARIOS = ["NORMAL", "HIGH_TEMPERATURE", "MOTOR_OVERLOAD", "EMERGENCY_STOP", "COMMUNICATION_LOSS"];

const SEVERITY_COLOR: Record<string, string> = {
  LOW: "#f5a623",
  MEDIUM: "#f5a623",
  HIGH: "#ff7043",
  CRITICAL: "#ff4d4f",
};

function ObjectTile({
  obj,
  tagValue,
}: {
  obj: { id: string; object_type: string; tag?: string | null; label?: string | null };
  tagValue: unknown;
}) {
  const displayValue = () => {
    if (tagValue === undefined) return "--";
    if (typeof tagValue === "boolean") return tagValue ? "ON" : "OFF";
    if (typeof tagValue === "number") return tagValue.toFixed(1);
    return String(tagValue);
  };

  const active = tagValue === true;

  return (
    <div className="card p-3 flex flex-col gap-2 min-h-[100px]">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[var(--text-dim)]">{obj.object_type}</span>
        {obj.object_type === "STATUS_INDICATOR" && (
          <span
            className="status-dot"
            style={{ background: obj.tag ? (active ? "#35c76a" : "#3a4a5a") : "#555" }}
          />
        )}
      </div>
      <div className="text-sm font-medium">{obj.label ?? obj.id}</div>
      <div className="text-xl font-semibold mono text-[var(--accent)]">
        {obj.tag ? displayValue() : <span className="text-red-400 text-sm">NO BINDING</span>}
      </div>
      {obj.tag && <div className="text-[10px] text-[var(--text-dim)] mono">{obj.tag}</div>}
    </div>
  );
}

export function VirtualHmi() {
  const { project, refreshValidation } = useProject();
  const [activeScreen, setActiveScreen] = useState<string>("dashboard");
  const [tags, setTags] = useState<Record<string, unknown>>({});
  const [scenario, setScenario] = useState("NORMAL");
  const [connStatus, setConnStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [scenarioLoading, setScenarioLoading] = useState<string | null>(null);
  const connRef = useRef<SimulationConnection | null>(null);

  useEffect(() => {
    api.simulationStart().catch(() => {
      /* toasted globally by api.ts; simulator may already be running */
    });
    const conn = simulationSocket(
      (data) => {
        setTags(data.tags ?? {});
        setScenario(data.scenario ?? "NORMAL");
      },
      setConnStatus
    );
    connRef.current = conn;
    return () => conn.close();
  }, []);

  useEffect(() => {
    if (project && project.screens.length && !project.screens.find((s) => s.id === activeScreen)) {
      setActiveScreen(project.screens[0].id);
    }
  }, [project, activeScreen]);

  async function handleScenario(name: string) {
    setScenarioLoading(name);
    try {
      await api.simulationScenario(name);
      await refreshValidation();
    } catch {
      /* toasted globally by api.ts */
    } finally {
      setScenarioLoading(null);
    }
  }

  if (!project) return <div className="text-[var(--text-dim)]">Loading...</div>;
  const screen = project.screens.find((s) => s.id === activeScreen) ?? project.screens[0];

  const activeAlarms = project.alarms.filter((a) => {
    const v = tags[a.tag];
    if (v === undefined) return false;
    const val = typeof v === "boolean" ? (v ? 1 : 0) : (v as number);
    if (a.condition === "GT") return val > a.threshold;
    if (a.condition === "LT") return val < a.threshold;
    if (a.condition === "EQ") return val === a.threshold;
    if (a.condition === "NEQ") return val !== a.threshold;
    return false;
  });

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Simulation Controls"
        right={
          <div className="flex items-center gap-3 text-xs text-[var(--text-dim)]">
            <span className="flex items-center gap-1.5">
              <span
                className="status-dot"
                style={{
                  background:
                    connStatus === "open" ? "#35c76a" : connStatus === "connecting" ? "#f5a623" : "#ff4d4f",
                }}
              />
              {connStatus === "open" ? "Live" : connStatus === "connecting" ? "Connecting..." : "Disconnected"}
            </span>
            <span>Scenario: {scenario}</span>
          </div>
        }
      >
        <div className="flex gap-2 flex-wrap">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              onClick={() => handleScenario(s)}
              disabled={scenarioLoading !== null}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition disabled:opacity-50 ${
                scenario === s
                  ? "bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)]"
              }`}
            >
              {scenarioLoading === s ? "..." : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex gap-2 border-b border-[var(--border)] pb-2">
            {project.screens.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveScreen(s.id)}
                className={`px-3 py-1.5 rounded-t text-sm font-medium ${
                  screen?.id === s.id
                    ? "bg-[var(--panel)] text-[var(--accent)] border border-b-0 border-[var(--border)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text)]"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          <Panel>
            {screen && screen.objects.length === 0 && screen.id !== "alarms" && (
              <div className="text-sm text-[var(--text-dim)]">No objects on this screen.</div>
            )}
            {screen?.id === "alarms" ? (
              <div className="flex flex-col gap-2">
                {project.alarms.map((a) => {
                  const firing = activeAlarms.some((x) => x.id === a.id);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between px-3 py-2 rounded border"
                      style={{
                        borderColor: firing ? SEVERITY_COLOR[a.severity] : "var(--border)",
                        background: firing ? `${SEVERITY_COLOR[a.severity]}14` : "transparent",
                      }}
                    >
                      <div>
                        <div className="text-sm font-medium">{a.name}</div>
                        <div className="text-xs text-[var(--text-dim)] mono">
                          {a.tag} {a.condition} {a.threshold}
                        </div>
                      </div>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded"
                        style={{ color: firing ? SEVERITY_COLOR[a.severity] : "#8fa3b5" }}
                      >
                        {firing ? `ACTIVE (${a.severity})` : "NORMAL"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {screen?.objects.map((o) => (
                  <ObjectTile key={o.id} obj={o} tagValue={o.tag ? tags[o.tag] : undefined} />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Machine Status">
            <div className="flex flex-col gap-2 text-sm">
              {Object.entries(tags).map(([tag, value]) => (
                <div key={tag} className="flex justify-between mono text-xs">
                  <span className="text-[var(--text-dim)]">{tag}</span>
                  <span>{typeof value === "boolean" ? (value ? "TRUE" : "FALSE") : String(value)}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Active Alarms">
            {activeAlarms.length === 0 ? (
              <div className="text-sm text-emerald-400">No active alarms</div>
            ) : (
              <div className="flex flex-col gap-1">
                {activeAlarms.map((a) => (
                  <div key={a.id} className="text-xs px-2 py-1 rounded" style={{ background: `${SEVERITY_COLOR[a.severity]}22`, color: SEVERITY_COLOR[a.severity] }}>
                    {a.name}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
