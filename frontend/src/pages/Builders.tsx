import { useState } from "react";
import { Panel } from "../components/Panel";
import { StatusPill } from "../components/StatusPill";
import { api, type ApplyLogEntry } from "../services/api";
import { useProject } from "../services/ProjectContext";

const CONDITIONS = ["GT", "LT", "EQ", "NEQ"] as const;
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export function Builders() {
  const { project, refreshProject, refreshValidation } = useProject();

  // Alarm Configuration Generator state
  const [alarmName, setAlarmName] = useState("");
  const [alarmTag, setAlarmTag] = useState("");
  const [alarmCondition, setAlarmCondition] = useState<(typeof CONDITIONS)[number]>("GT");
  const [alarmThreshold, setAlarmThreshold] = useState("80");
  const [alarmSeverity, setAlarmSeverity] = useState<(typeof SEVERITIES)[number]>("MEDIUM");
  const [alarmLog, setAlarmLog] = useState<ApplyLogEntry[] | null>(null);
  const [alarmBusy, setAlarmBusy] = useState(false);

  // Navigation Builder state
  const [navFrom, setNavFrom] = useState("");
  const [navTo, setNavTo] = useState("");
  const [navLog, setNavLog] = useState<ApplyLogEntry[] | null>(null);
  const [navBusy, setNavBusy] = useState(false);

  if (!project) return <div className="text-[var(--text-dim)]">Loading...</div>;

  const tags = project.tags;
  const screens = project.screens;
  const effectiveAlarmTag = alarmTag || tags[0]?.name || "";
  const effectiveNavFrom = navFrom || screens[0]?.id || "";
  const effectiveNavTo = navTo || screens[1]?.id || screens[0]?.id || "";

  async function handleCreateAlarm() {
    if (!alarmName.trim() || !effectiveAlarmTag) return;
    setAlarmBusy(true);
    setAlarmLog(null);
    try {
      const res = await api.apply({
        summary: "Manual alarm configuration",
        actions: [
          {
            action: "CREATE_ALARM",
            alarm: alarmName.trim(),
            tag: effectiveAlarmTag,
            threshold: parseFloat(alarmThreshold) || 0,
            condition: alarmCondition,
            severity: alarmSeverity,
          },
        ],
        unknowns: [],
      });
      setAlarmLog(res.log);
      await refreshProject();
      await refreshValidation();
      setAlarmName("");
    } catch {
      /* toasted globally */
    } finally {
      setAlarmBusy(false);
    }
  }

  async function handleCreateNav() {
    if (!effectiveNavFrom || !effectiveNavTo || effectiveNavFrom === effectiveNavTo) return;
    setNavBusy(true);
    setNavLog(null);
    try {
      const res = await api.apply({
        summary: "Manual navigation configuration",
        actions: [{ action: "ADD_NAVIGATION", from_screen: effectiveNavFrom, to_screen: effectiveNavTo }],
        unknowns: [],
      });
      setNavLog(res.log);
      await refreshProject();
      await refreshValidation();
    } catch {
      /* toasted globally */
    } finally {
      setNavBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Configuration Builders">
        <p className="text-xs text-[var(--text-dim)]">
          Direct forms for the same deterministic executor the AI planner uses -- every alarm and
          navigation link created here is validated the same way (real tag/screen required) and follows the
          project's neutral schema, not a verified EOTE alarm-config or navigation-object field layout
          (that reference wasn't available to this project).
        </p>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Alarm Configuration Generator">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-dim)]">Alarm name</label>
              <input
                value={alarmName}
                onChange={(e) => setAlarmName(e.target.value)}
                placeholder="e.g. High Vibration"
                className="bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-dim)]">Tag</label>
              <select
                value={effectiveAlarmTag}
                onChange={(e) => setAlarmTag(e.target.value)}
                className="bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-sm"
              >
                {tags.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.data_type})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-dim)]">Condition</label>
                <select
                  value={alarmCondition}
                  onChange={(e) => setAlarmCondition(e.target.value as (typeof CONDITIONS)[number])}
                  className="bg-[var(--panel-2)] border border-[var(--border)] rounded px-2 py-2 text-sm"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-dim)]">Threshold</label>
                <input
                  type="number"
                  value={alarmThreshold}
                  onChange={(e) => setAlarmThreshold(e.target.value)}
                  className="bg-[var(--panel-2)] border border-[var(--border)] rounded px-2 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--text-dim)]">Severity</label>
                <select
                  value={alarmSeverity}
                  onChange={(e) => setAlarmSeverity(e.target.value as (typeof SEVERITIES)[number])}
                  className="bg-[var(--panel-2)] border border-[var(--border)] rounded px-2 py-2 text-sm"
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleCreateAlarm}
              disabled={alarmBusy || !alarmName.trim()}
              className="px-4 py-2 rounded bg-[var(--accent)] text-[#03121c] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 self-start"
            >
              {alarmBusy ? "Creating..." : "Create Alarm"}
            </button>
            {alarmLog && (
              <div className="flex flex-col gap-1 anim-rise-in">
                {alarmLog.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-[var(--panel-2)] rounded px-2 py-1.5">
                    <span>{entry.reason ?? entry.action}</span>
                    <StatusPill status={entry.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Navigation Builder">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-dim)]">From screen</label>
              <select
                value={effectiveNavFrom}
                onChange={(e) => setNavFrom(e.target.value)}
                className="bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-sm"
              >
                {screens.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--text-dim)]">To screen</label>
              <select
                value={effectiveNavTo}
                onChange={(e) => setNavTo(e.target.value)}
                className="bg-[var(--panel-2)] border border-[var(--border)] rounded px-3 py-2 text-sm"
              >
                {screens.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCreateNav}
              disabled={navBusy || effectiveNavFrom === effectiveNavTo}
              className="px-4 py-2 rounded bg-emerald-500/90 text-[#03120b] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 self-start"
            >
              {navBusy ? "Linking..." : "Add Navigation Link"}
            </button>
            {effectiveNavFrom === effectiveNavTo && (
              <div className="text-xs text-amber-400">Pick two different screens.</div>
            )}
            {navLog && (
              <div className="flex flex-col gap-1 anim-rise-in">
                {navLog.map((entry, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-[var(--panel-2)] rounded px-2 py-1.5">
                    <span>{entry.action}</span>
                    <StatusPill status={entry.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
