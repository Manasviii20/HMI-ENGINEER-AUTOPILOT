import { Panel } from "../components/Panel";
import { useProject } from "../services/ProjectContext";
import { useCountUp } from "../hooks/useCountUp";

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  const animated = useCountUp(value);
  return (
    <div className="card p-4 flex flex-col gap-1 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/40 anim-rise-in">
      <span className="text-xs uppercase tracking-wider text-[var(--text-dim)]">{label}</span>
      <span className="text-2xl font-semibold mono" style={{ color: accent }}>
        {animated}
      </span>
      <div className="h-1 rounded-full bg-[var(--panel-2)] overflow-hidden mt-1">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: value > 0 ? "100%" : "0%", background: accent }}
        />
      </div>
    </div>
  );
}

function Chip({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="text-xs px-2 py-1 rounded-full border transition-transform duration-150 hover:scale-105"
      style={{ borderColor: `${color}55`, background: `${color}14`, color }}
    >
      {text}
    </span>
  );
}

export function Dashboard() {
  const { summary, validation, approved, loading } = useProject();

  if (loading || !summary) {
    return (
      <div className="flex flex-col gap-6">
        <div className="card p-5 h-20 anim-shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-24 anim-shimmer" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  const passPct = validation
    ? Math.round((validation.summary.scenarios_passed / Math.max(1, validation.summary.scenarios_total)) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Project" className="anim-rise-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">{summary.project_name}</div>
            <div className="text-xs text-[var(--text-dim)] mt-1">
              Neutral HMI engineering project representation (not a native EOTE export)
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-dim)]">Engineering status</span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold border transition-colors-smooth ${
                approved
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                  : "bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/40"
              }`}
            >
              {approved && <span className="status-dot anim-pulse mr-1.5" style={{ background: "currentColor" }} />}
              {approved ? "APPROVED" : "IN PROGRESS"}
            </span>
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div style={{ animationDelay: "0ms" }}>
          <Stat label="Tags" value={summary.tag_count} accent="#35c76a" />
        </div>
        <div style={{ animationDelay: "60ms" }}>
          <Stat label="Screens" value={summary.screen_count} accent="#2fb3ff" />
        </div>
        <div style={{ animationDelay: "120ms" }}>
          <Stat label="Objects" value={summary.object_count} accent="#a78bfa" />
        </div>
        <div style={{ animationDelay: "180ms" }}>
          <Stat label="Alarms" value={summary.alarm_count} accent="#ff7043" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="Validation Status">
          {validation ? (
            <div className="flex items-center gap-5">
              <svg width="88" height="88" viewBox="0 0 88 88" className="shrink-0">
                <circle cx="44" cy="44" r="38" fill="none" stroke="var(--panel-2)" strokeWidth="8" />
                <circle
                  cx="44"
                  cy="44"
                  r="38"
                  fill="none"
                  stroke={validation.status === "PASS" ? "#35c76a" : "#ff4d4f"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 38}
                  strokeDashoffset={2 * Math.PI * 38 * (1 - passPct / 100)}
                  transform="rotate(-90 44 44)"
                  className="transition-all duration-700 ease-out"
                />
                <text x="44" y="40" textAnchor="middle" fontSize="18" fontWeight={700} fill="var(--text)">
                  {passPct}%
                </text>
                <text x="44" y="56" textAnchor="middle" fontSize="9" fill="var(--text-dim)">
                  scenarios
                </text>
              </svg>
              <div className="flex flex-col gap-2 text-sm flex-1">
                <div className="flex justify-between">
                  <span className="text-[var(--text-dim)]">Overall</span>
                  <span className={`font-semibold ${validation.status === "PASS" ? "text-emerald-400" : "text-red-400"}`}>
                    {validation.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-dim)]">Structural issues</span>
                  <span>{validation.summary.structural_issue_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-dim)]">Simulation scenarios passed</span>
                  <span>
                    {validation.summary.scenarios_passed}/{validation.summary.scenarios_total}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[var(--text-dim)] text-sm">No validation run yet</div>
          )}
        </Panel>

        <Panel title="Engineering Structure">
          <div className="flex flex-col gap-3 text-sm">
            <div>
              <div className="text-[var(--text-dim)] text-xs mb-1.5">Screens</div>
              <div className="flex flex-wrap gap-1.5">
                {summary.screens.map((s) => (
                  <Chip key={s} text={s} color="#2fb3ff" />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-dim)] text-xs mb-1.5">Alarms</div>
              <div className="flex flex-wrap gap-1.5">
                {summary.alarms.map((a) => (
                  <Chip key={a} text={a} color="#ff7043" />
                ))}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-dim)] text-xs mb-1.5">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {summary.tags.map((t) => (
                  <Chip key={t} text={t} color="#35c76a" />
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
