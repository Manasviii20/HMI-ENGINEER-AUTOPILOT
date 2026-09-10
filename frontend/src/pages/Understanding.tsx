import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Panel } from "../components/Panel";
import { useProject } from "../services/ProjectContext";

const CHECKS = [
  "Reading project files",
  "Identifying equipment",
  "Extracting tags",
  "Detecting measurements",
  "Detecting existing alarms",
  "Matching available templates",
  "Identifying missing requirements",
];

const STEP_MS = 260;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Step 2/7 -- makes the AI's reading of the requirement visible instead of
 * jumping straight to a dashboard: a checklist animation while the plan is
 * generated, then a plain-language summary of what it found. */
export function Understanding() {
  const location = useLocation() as { state?: { requirement?: string } };
  const navigate = useNavigate();
  const { startUnderstanding, plan, planMockMode, requirement, summary } = useProject();
  const [checked, setChecked] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    const req = location.state?.requirement ?? requirement;
    if (!req) {
      navigate("/", { replace: true });
      return;
    }
    if (started.current) return;
    started.current = true;

    const checkTimer = setInterval(() => {
      setChecked((c) => Math.min(c + 1, CHECKS.length));
    }, STEP_MS);

    (async () => {
      try {
        await Promise.all([startUnderstanding(req), delay(CHECKS.length * STEP_MS + 500)]);
        setChecked(CHECKS.length);
        setReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        clearInterval(checkTimer);
      }
    })();

    return () => clearInterval(checkTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const equipment = useMemo(() => {
    if (!plan) return [];
    const byScreen = new Map<string, Set<string>>();
    for (const a of plan.actions) {
      if (!a.screen) continue;
      if (!byScreen.has(a.screen)) byScreen.set(a.screen, new Set());
      if (a.tag) byScreen.get(a.screen)!.add(a.tag);
    }
    return Array.from(byScreen.entries()).map(([screen, tags]) => ({ screen, tagCount: tags.size }));
  }, [plan]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-red-400 text-sm max-w-md">{error}</div>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 rounded border border-[var(--accent)] text-[var(--accent)] text-sm font-semibold hover:bg-[var(--accent)]/10 transition-all duration-150"
        >
          Back to Start
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full">
      <div className="text-center mb-2 anim-rise-in">
        <div className="text-lg font-semibold">AI is analyzing your project</div>
        <div className="text-xs text-[var(--text-dim)] mt-1">
          Deriving process flow, tags, alarms and HMI requirements from your requirement.
        </div>
      </div>

      <Panel
        title="Understanding Requirements"
        right={<span className="text-xs text-[var(--text-dim)]">{planMockMode ? "Mock planner" : "LLM-backed planner"}</span>}
      >
        <div className="flex flex-col gap-2">
          {CHECKS.map((c, i) => (
            <div
              key={c}
              className={`flex items-center gap-2 text-sm transition-opacity duration-300 ${i < checked ? "opacity-100" : "opacity-30"}`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                  i < checked ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "border border-[var(--border)] text-[var(--text-dim)]"
                }`}
              >
                {i < checked ? "✓" : ""}
              </span>
              {c}
            </div>
          ))}
        </div>
      </Panel>

      {ready && plan && (
        <>
          {summary && summary.tags.length > 0 && (
            <Panel title="Existing machine tags recognized">
              <div className="flex flex-wrap gap-2">
                {summary.tags.map((t, i) => (
                  <span
                    key={t}
                    className="text-xs mono px-2 py-1 rounded bg-[var(--panel-2)] border border-[var(--border)] anim-pop-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Equipment & screens detected in your requirement">
            {equipment.length === 0 ? (
              <div className="text-sm text-[var(--text-dim)]">
                No new equipment groupings detected -- see the engineering plan for the exact actions proposed.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {equipment.map((e, i) => (
                  <div
                    key={e.screen}
                    className="flex items-center justify-between text-sm bg-[var(--panel-2)] rounded px-3 py-2 border border-[var(--border)] anim-rise-in"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <span>✓ {e.screen}</span>
                    <span className="text-xs text-[var(--text-dim)] mono">{e.tagCount} tag(s)</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="AI understanding"
            right={
              plan.unknowns.length > 0 ? (
                <span className="text-xs text-amber-400">⚠ {plan.unknowns.length} decision(s) needed</span>
              ) : undefined
            }
          >
            <p className="text-sm anim-rise-in">{plan.summary}</p>
            {plan.unknowns.length > 0 && (
              <div className="mt-3 text-xs bg-amber-500/10 border border-amber-500/30 rounded p-2 text-amber-400 anim-rise-in">
                {plan.unknowns.length} tag(s) require engineering decisions: {plan.unknowns.join("; ")}
              </div>
            )}
          </Panel>

          <div className="flex justify-end anim-rise-in">
            <button
              onClick={() => navigate("/plan")}
              className="px-5 py-2.5 rounded bg-[var(--accent)] text-[#03121c] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150"
            >
              Review Findings →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
