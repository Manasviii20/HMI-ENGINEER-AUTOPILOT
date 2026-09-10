import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Panel } from "../components/Panel";
import { useProject } from "../services/ProjectContext";

const BUILD_CAPTIONS = [
  "Generating tags...",
  "Creating screens...",
  "Wiring alarms...",
  "Building navigation...",
  "Validating...",
  "Starting virtual machine...",
];

/** Step 3/7 -- the human-in-the-loop checkpoint. Nothing is built yet: this
 * is the AI's proposal, and the engineer explicitly approves it (or goes
 * back to change the requirement) before anything is generated. */
export function PlanReview() {
  const navigate = useNavigate();
  const { plan, planMockMode, buildProject } = useProject();
  const [building, setBuilding] = useState(false);
  const [caption, setCaption] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!plan) return null;

  const screenCount = new Set(plan.actions.filter((a) => a.screen).map((a) => a.screen)).size;
  const tagCount = new Set(plan.actions.filter((a) => a.tag).map((a) => a.tag)).size;
  const alarmCount = plan.actions.filter((a) => a.action === "CREATE_ALARM").length;

  async function handleApprove() {
    setBuilding(true);
    setError(null);
    const timer = setInterval(() => setCaption((c) => Math.min(c + 1, BUILD_CAPTIONS.length - 1)), 500);
    try {
      await buildProject();
      navigate("/workspace/model");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBuilding(false);
    } finally {
      clearInterval(timer);
    }
  }

  if (building) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-lg font-semibold">Building your HMI project</div>
        <div key={caption} className="text-sm text-[var(--text-dim)] anim-rise-in">
          {BUILD_CAPTIONS[caption]}
        </div>
        <div className="w-64 h-1 rounded-full bg-[var(--panel-2)] overflow-hidden relative">
          <div
            className="absolute inset-y-0 left-0 w-1/3 rounded-full anim-progress-bar"
            style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <div className="text-center mb-2 anim-rise-in">
        <div className="text-lg font-semibold">Here's what I propose to build</div>
        <div className="text-xs text-[var(--text-dim)] mt-1">
          Review the plan below. Nothing has been generated yet -- approve it to build the project.
        </div>
      </div>

      <Panel
        title="Engineering Plan"
        right={<span className="text-xs text-[var(--text-dim)]">{planMockMode ? "Mock planner" : "LLM-backed planner"}</span>}
      >
        <div className="text-sm text-[var(--text-dim)] mb-4">{plan.summary}</div>
        <div className="flex flex-col gap-1 max-h-72 overflow-auto">
          {plan.actions.map((a, i) => (
            <div
              key={i}
              className="text-xs mono bg-[var(--panel-2)] rounded px-2 py-1.5 border border-[var(--border)] anim-rise-in"
              style={{ animationDelay: `${i * 40}ms` }}
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
          <div className="mt-3 text-xs bg-amber-500/10 border border-amber-500/30 rounded p-2 text-amber-400 anim-rise-in">
            UNKNOWN / requires engineer input: {plan.unknowns.join("; ")}
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center anim-pop-in">
          <div className="text-2xl font-bold mono">{tagCount}</div>
          <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider mt-1">Tags</div>
        </div>
        <div className="card p-4 text-center anim-pop-in" style={{ animationDelay: "60ms" }}>
          <div className="text-2xl font-bold mono">{screenCount}</div>
          <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider mt-1">Screens</div>
        </div>
        <div className="card p-4 text-center anim-pop-in" style={{ animationDelay: "120ms" }}>
          <div className="text-2xl font-bold mono">{alarmCount}</div>
          <div className="text-xs text-[var(--text-dim)] uppercase tracking-wider mt-1">Alarm Rules</div>
        </div>
      </div>

      {error && <div className="text-sm text-red-400 anim-rise-in">{error}</div>}

      <div className="flex justify-between">
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 rounded border border-[var(--border)] text-sm text-[var(--text-dim)] hover:text-[var(--text)] transition-colors-smooth"
        >
          ← Edit Requirement
        </button>
        <button
          onClick={handleApprove}
          className="px-5 py-2.5 rounded bg-emerald-500/90 text-[#03120b] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150"
        >
          Approve & Build →
        </button>
      </div>
    </div>
  );
}
