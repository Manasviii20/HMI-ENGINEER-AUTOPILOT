import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Panel } from "../components/Panel";
import { PipelineStepper, type PipelineStep } from "../components/PipelineStepper";
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

function timeAgo(ts: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

const STAGE_COLOR: Record<string, string> = {
  plan: "#2fb3ff",
  generate: "#35c76a",
  correction: "#f5a623",
  simulation: "#a78bfa",
  manual: "#8fa3b5",
};

export function Dashboard() {
  const {
    summary,
    validation,
    approved,
    loading,
    activity,
    exported,
    hasEngineeringActivity,
    hasCorrectionActivity,
    hasSimulationActivity,
  } = useProject();

  const pipelineSteps: PipelineStep[] = useMemo(
    () => [
      {
        id: "input",
        label: "Input",
        state: "done",
        description: "Project loaded and ready to receive an engineering requirement.",
      },
      {
        id: "graph",
        label: "Project Graph",
        state: "done",
        description: "Tags, screens, objects, alarms and navigation parsed into a live dependency graph.",
      },
      {
        id: "generate",
        label: "AI Generation",
        state: hasEngineeringActivity ? "done" : "idle",
        description: hasEngineeringActivity
          ? "An AI-generated engineering plan has been applied to this project."
          : "Waiting -- submit a requirement on the Engineering page.",
      },
      {
        id: "simulate",
        label: "Simulation",
        state: hasSimulationActivity ? "done" : "idle",
        description: hasSimulationActivity
          ? "The virtual machine is running -- live tag values are streaming."
          : "Waiting -- open the Virtual HMI page to start the simulator.",
      },
      {
        id: "validate",
        label: "Validation",
        state: !validation ? "idle" : validation.status === "PASS" ? "done" : "error",
        description: !validation
          ? "Waiting for validation to run."
          : validation.status === "PASS"
          ? "Structural and simulation-scenario checks pass."
          : `${validation.summary.structural_issue_count} structural issue(s) detected.`,
      },
      {
        id: "correct",
        label: "Self-Correction",
        state: hasCorrectionActivity ? "done" : validation?.status === "FAILED" ? "idle" : "idle",
        description: hasCorrectionActivity
          ? "AI self-correction has run against detected issues."
          : validation?.status === "FAILED"
          ? "Issues detected -- run auto-fix on the Validation page."
          : "No corrections needed yet.",
      },
      {
        id: "approve",
        label: "Approval",
        state: approved ? "done" : "idle",
        description: approved ? "Engineer has approved this project." : "Waiting for engineer approval (requires validation PASS).",
      },
      {
        id: "export",
        label: "Export",
        state: exported ? "done" : "idle",
        description: exported
          ? "Validated project package exported."
          : "Waiting -- export from the Review / Export page.",
      },
    ],
    [hasEngineeringActivity, hasSimulationActivity, validation, hasCorrectionActivity, approved, exported]
  );

  if (loading || !summary) {
    return (
      <div className="flex flex-col gap-6">
        <div className="card p-5 h-28 anim-shimmer" />
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
              AI-generated, validated HMI engineering project representation (not a native EOTE export)
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

      <Panel
        title="Engineering Pipeline"
        right={<span className="text-xs text-[var(--text-dim)]">where is this project right now?</span>}
      >
        <PipelineStepper steps={pipelineSteps} />
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
        <Panel title="Validation Status" right={<Link to="/validation" className="text-xs text-[var(--accent)] hover:underline">Details →</Link>}>
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

        <Panel title="Recent Engineering Activity">
          {activity.length === 0 ? (
            <div className="text-sm text-[var(--text-dim)]">
              No activity yet -- generate a plan on the Engineering page to get started.
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-48 overflow-auto">
              {activity.slice(0, 8).map((a) => (
                <div key={a.id} className="flex items-start gap-2 text-xs anim-rise-in">
                  <span
                    className="status-dot mt-1 shrink-0"
                    style={{ background: STAGE_COLOR[a.stage] ?? "#8fa3b5" }}
                  />
                  <span className="flex-1 text-[var(--text)]">{a.text}</span>
                  <span className="text-[var(--text-dim)] shrink-0">{timeAgo(a.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

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
  );
}
