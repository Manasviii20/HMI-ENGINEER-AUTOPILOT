export type StepState = "idle" | "active" | "done" | "error";

export interface PipelineStep {
  id: string;
  label: string;
  state: StepState;
  /** Plain-language explanation of what this stage does / is doing. */
  description: string;
}

const STATE_STYLE: Record<StepState, { ring: string; fill: string; text: string }> = {
  idle: { ring: "border-[var(--border)]", fill: "bg-[var(--panel-2)]", text: "text-[var(--text-dim)]" },
  active: { ring: "border-[var(--accent)]", fill: "bg-[var(--accent)]/20", text: "text-[var(--accent)]" },
  done: { ring: "border-emerald-500/60", fill: "bg-emerald-500/20", text: "text-emerald-400" },
  error: { ring: "border-red-500/60", fill: "bg-red-500/20", text: "text-red-400" },
};

const STATE_WORD: Record<StepState, string> = {
  idle: "Waiting",
  active: "Working…",
  done: "Done",
  error: "Failed",
};

/**
 * Animated horizontal pipeline visualizing the engineering workflow stages
 * (Requirement -> AI Plan -> Generate -> Validate). Purely presentational --
 * driven entirely by the `state` each caller passes in from data it already
 * has (loading flags, plan/log presence). No new data fetching happens here.
 *
 * Each step shows a plain-language status word under its label, and the
 * step currently in progress (or the most recent one) surfaces its
 * description in a caption line below the whole stepper, so it's obvious
 * what the pipeline is doing at any given moment -- not just "some circle
 * turned green".
 */
export function PipelineStepper({ steps }: { steps: PipelineStep[] }) {
  const highlighted =
    steps.find((s) => s.state === "active") ??
    steps.find((s) => s.state === "error") ??
    [...steps].reverse().find((s) => s.state === "done") ??
    steps[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center w-full overflow-x-auto py-1">
        {steps.map((step, i) => {
          const style = STATE_STYLE[step.state];
          const isLast = i === steps.length - 1;
          return (
            <div key={step.id} className="flex items-center flex-1 min-w-[130px]">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${style.ring} ${style.fill} ${style.text} ${
                    step.state === "active" ? "anim-step-active" : ""
                  }`}
                  title={step.description}
                >
                  {step.state === "done" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : step.state === "error" ? (
                    "!"
                  ) : step.state === "active" ? (
                    <span className="w-2 h-2 rounded-full bg-current anim-pulse" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-[10px] font-semibold whitespace-nowrap ${style.text}`}>{step.label}</span>
                <span className="text-[9px] whitespace-nowrap text-[var(--text-dim)]">{STATE_WORD[step.state]}</span>
              </div>
              {!isLast && (
                <div className="flex-1 h-[2px] mx-1 rounded-full bg-[var(--border)] relative overflow-hidden -translate-y-4">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: step.state === "done" ? "100%" : "0%",
                      background: "linear-gradient(90deg, #35c76a, #2fb3ff)",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {highlighted && (
        <div
          key={highlighted.id + highlighted.state}
          className="anim-rise-in text-xs px-3 py-2 rounded border border-[var(--border)] flex items-center gap-2"
          style={{ background: "var(--panel-2)" }}
        >
          <span
            className={`status-dot ${highlighted.state === "active" ? "anim-pulse" : ""}`}
            style={{
              background:
                highlighted.state === "done" ? "#35c76a" : highlighted.state === "error" ? "#ff4d4f" : "var(--accent)",
            }}
          />
          <span className="font-semibold">{highlighted.label}:</span>
          <span className="text-[var(--text-dim)]">{highlighted.description}</span>
        </div>
      )}
    </div>
  );
}
