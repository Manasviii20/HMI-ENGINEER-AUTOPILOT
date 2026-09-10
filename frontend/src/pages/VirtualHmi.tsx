import { useEffect, useMemo, useRef, useState } from "react";
import { Panel } from "../components/Panel";
import { PlantScene } from "../components/PlantScene";
import { api, simulationSocket, type SimulationConnection } from "../services/api";
import { useProject } from "../services/ProjectContext";

const SCENARIOS = ["NORMAL", "HIGH_TEMPERATURE", "MOTOR_OVERLOAD", "EMERGENCY_STOP", "COMMUNICATION_LOSS"];

const SEVERITY_COLOR: Record<string, string> = {
  LOW: "#f5a623",
  MEDIUM: "#f5a623",
  HIGH: "#ff7043",
  CRITICAL: "#ff4d4f",
};

// Sensible display ranges for animating a mini bar under numeric gauges —
// purely cosmetic, doesn't affect any validation/alarm logic.
const NUMERIC_RANGE: Record<string, [number, number]> = {
  Motor_01_Speed: [0, 120],
  Motor_01_Temperature: [0, 120],
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
  const isNumeric = typeof tagValue === "number";
  const range = obj.tag ? NUMERIC_RANGE[obj.tag] : undefined;
  const pct = isNumeric && range ? Math.max(0, Math.min(100, ((tagValue as number) - range[0]) / (range[1] - range[0]) * 100)) : null;
  const barColor = pct !== null ? (pct > 80 ? "#ff4d4f" : pct > 60 ? "#ff7043" : "#2fb3ff") : "#2fb3ff";

  return (
    <div className="card p-3 flex flex-col gap-2 min-h-[100px] transition-colors-smooth hover:border-[var(--accent)]/40">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[var(--text-dim)]">{obj.object_type}</span>
        {obj.object_type === "STATUS_INDICATOR" && (
          <span
            className={`status-dot ${active ? "anim-pulse" : ""}`}
            style={{ background: obj.tag ? (active ? "#35c76a" : "#3a4a5a") : "#555", color: "#35c76a" }}
          />
        )}
      </div>
      <div className="text-sm font-medium">{obj.label ?? obj.id}</div>
      <div
        key={typeof tagValue === "number" ? Math.round(tagValue) : String(tagValue)}
        className="text-xl font-semibold mono text-[var(--accent)] anim-pop-in"
      >
        {obj.tag ? displayValue() : <span className="text-red-400 text-sm">NO BINDING</span>}
      </div>
      {pct !== null && (
        <div className="h-1.5 rounded-full bg-[var(--panel-2)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      )}
      {obj.tag && <div className="text-[10px] text-[var(--text-dim)] mono">{obj.tag}</div>}
    </div>
  );
}

export function VirtualHmi() {
  const { project, refreshValidation, pushActivity, hasSimulationActivity } = useProject();
  const [activeScreen, setActiveScreen] = useState<string>("dashboard");
  const [tags, setTags] = useState<Record<string, unknown>>({});
  const [scenario, setScenario] = useState("NORMAL");
  const [connStatus, setConnStatus] = useState<"connecting" | "open" | "closed">("connecting");
  const [scenarioLoading, setScenarioLoading] = useState<string | null>(null);
  const connRef = useRef<SimulationConnection | null>(null);

  useEffect(() => {
    api
      .simulationStart()
      .then(() => {
        if (!hasSimulationActivity) pushActivity("simulation", "Virtual machine simulation started");
      })
      .catch(() => {
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
      if (name !== "NORMAL") {
        pushActivity("simulation", `Fault injected: ${name.replace(/_/g, " ")}`);
      }
    } catch {
      /* toasted globally by api.ts */
    } finally {
      setScenarioLoading(null);
    }
  }

  const activeAlarms = useMemo(() => {
    if (!project) return [];
    return project.alarms.filter((a) => {
      const v = tags[a.tag];
      if (v === undefined) return false;
      const val = typeof v === "boolean" ? (v ? 1 : 0) : (v as number);
      if (a.condition === "GT") return val > a.threshold;
      if (a.condition === "LT") return val < a.threshold;
      if (a.condition === "EQ") return val === a.threshold;
      if (a.condition === "NEQ") return val !== a.threshold;
      return false;
    });
  }, [project, tags]);

  if (!project) return <div className="text-[var(--text-dim)]">Loading...</div>;
  const screen = project.screens.find((s) => s.id === activeScreen) ?? project.screens[0];

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Inject Fault"
        right={
          <div className="flex items-center gap-3 text-xs text-[var(--text-dim)]">
            <span className="flex items-center gap-1.5">
              <span
                className={`status-dot ${connStatus === "open" ? "anim-pulse" : connStatus === "connecting" ? "anim-shimmer" : ""}`}
                style={{
                  background:
                    connStatus === "open" ? "#35c76a" : connStatus === "connecting" ? "#f5a623" : "#ff4d4f",
                  color: connStatus === "open" ? "#35c76a" : "#ff4d4f",
                }}
              />
              {connStatus === "open" ? "Live" : connStatus === "connecting" ? "Connecting..." : "Disconnected"}
            </span>
            <span>Scenario: {scenario}</span>
          </div>
        }
      >
        <p className="text-xs text-[var(--text-dim)] mb-3">
          Select a scenario to change the virtual machine's real state. Watch it propagate: tag values
          change → the HMI below reacts live → alarms fire → the Validation page can catch anything wrong.
        </p>
        <div className="flex gap-2 flex-wrap">
          {SCENARIOS.map((s) => (
            <button
              key={s}
              onClick={() => handleScenario(s)}
              disabled={scenarioLoading !== null}
              className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all duration-150 active:scale-95 disabled:opacity-50 ${
                scenario === s
                  ? "bg-[var(--accent)]/20 border-[var(--accent)] text-[var(--accent)] scale-105"
                  : "border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent)]/40"
              }`}
            >
              {scenarioLoading === s ? "..." : s.replace("_", " ")}
            </button>
          ))}
        </div>

        {scenario !== "NORMAL" && (
          <div key={scenario} className="anim-rise-in mt-4 pt-3 border-t border-[var(--border)]">
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] mb-2">Cause → Effect</div>
            <div className="flex items-center gap-2 flex-wrap text-xs mono">
              <span className="px-2 py-1 rounded bg-red-500/10 border border-red-500/30 text-red-400">
                FAULT: {scenario.replace(/_/g, " ")}
              </span>
              <span className="text-[var(--text-dim)]">→</span>
              <span className="px-2 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)]">
                Tags updated
              </span>
              <span className="text-[var(--text-dim)]">→</span>
              <span className="px-2 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)]">
                HMI reacted
              </span>
              <span className="text-[var(--text-dim)]">→</span>
              {activeAlarms.length > 0 ? (
                <span className="px-2 py-1 rounded bg-red-500/15 border border-red-500/40 text-red-400 anim-pulse">
                  {activeAlarms.length} alarm(s) ACTIVE
                </span>
              ) : (
                <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  no alarm triggered
                </span>
              )}
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title="Physical Process"
        right={<span className="text-xs text-[var(--text-dim)]">Packaging Conveyor / Motor System</span>}
      >
        <PlantScene
          motorRunning={tags["Motor_01_Run"] === true}
          conveyorRunning={tags["Conveyor_01_Run"] === true}
          speed={typeof tags["Motor_01_Speed"] === "number" ? (tags["Motor_01_Speed"] as number) : 0}
          temperature={typeof tags["Motor_01_Temperature"] === "number" ? (tags["Motor_01_Temperature"] as number) : 0}
          overload={tags["Motor_01_Overload"] === true}
          emergencyStop={tags["Emergency_Stop"] === true}
          productSensor={tags["Product_Sensor"] === true}
          communication={tags["PLC_Communication"] === true}
          activeAlarmCount={activeAlarms.length}
        />
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex gap-2 border-b border-[var(--border)] pb-2">
            {project.screens.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveScreen(s.id)}
                className={`relative px-3 py-1.5 rounded-t text-sm font-medium transition-all duration-150 ${
                  screen?.id === s.id
                    ? "bg-[var(--panel)] text-[var(--accent)] border border-b-0 border-[var(--border)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text)]"
                }`}
              >
                {s.name}
                {screen?.id === s.id && (
                  <span className="absolute left-2 right-2 -bottom-[1px] h-[2px] bg-[var(--accent)] rounded-full" />
                )}
              </button>
            ))}
          </div>
          <Panel>
            {screen && screen.objects.length === 0 && screen.id !== "alarms" && (
              <div className="text-sm text-[var(--text-dim)]">No objects on this screen.</div>
            )}
            {screen?.id === "alarms" ? (
              <div className="flex flex-col gap-2">
                {project.alarms.map((a, i) => {
                  const firing = activeAlarms.some((x) => x.id === a.id);
                  return (
                    <div
                      key={a.id}
                      className="flex items-center justify-between px-3 py-2 rounded border anim-rise-in transition-colors-smooth"
                      style={{
                        borderColor: firing ? SEVERITY_COLOR[a.severity] : "var(--border)",
                        background: firing ? `${SEVERITY_COLOR[a.severity]}14` : "transparent",
                        animationDelay: `${i * 60}ms`,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {firing && (
                          <span
                            className="status-dot anim-flash"
                            style={{ background: SEVERITY_COLOR[a.severity] }}
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium">{a.name}</div>
                          <div className="text-xs text-[var(--text-dim)] mono">
                            {a.tag} {a.condition} {a.threshold}
                          </div>
                        </div>
                      </div>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded transition-colors-smooth"
                        style={{ color: firing ? SEVERITY_COLOR[a.severity] : "var(--text-dim)" }}
                      >
                        {firing ? `ACTIVE (${a.severity})` : "NORMAL"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {screen?.objects.map((o, i) => (
                  <div key={o.id} style={{ animationDelay: `${i * 60}ms` }} className="anim-rise-in">
                    <ObjectTile obj={o} tagValue={o.tag ? tags[o.tag] : undefined} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel title="Machine Status">
            <div className="flex flex-col gap-2 text-sm">
              {Object.entries(tags).map(([tag, value]) => (
                <div key={tag} className="flex justify-between mono text-xs items-center">
                  <span className="text-[var(--text-dim)]">{tag}</span>
                  <span
                    key={typeof value === "number" ? Math.round(value) : String(value)}
                    className={`anim-rise-in ${value === true ? "text-emerald-400" : value === false ? "text-[var(--text-dim)]" : "text-[var(--text)]"}`}
                  >
                    {typeof value === "boolean" ? (value ? "TRUE" : "FALSE") : typeof value === "number" ? value.toFixed(2) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Active Alarms" right={activeAlarms.length > 0 ? <span className="status-dot anim-flash" style={{ background: "#ff4d4f" }} /> : undefined}>
            {activeAlarms.length === 0 ? (
              <div className="text-sm text-emerald-400 flex items-center gap-2">
                <span className="status-dot" style={{ background: "#35c76a" }} />
                No active alarms
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {activeAlarms.map((a, i) => (
                  <div
                    key={a.id}
                    className="text-xs px-2 py-1 rounded anim-rise-in flex items-center gap-1.5"
                    style={{ background: `${SEVERITY_COLOR[a.severity]}22`, color: SEVERITY_COLOR[a.severity], animationDelay: `${i * 80}ms` }}
                  >
                    <span className="status-dot anim-pulse" style={{ background: SEVERITY_COLOR[a.severity] }} />
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
