export type StepState = "idle" | "active" | "done" | "error";

export interface PipelineStep {
  id: string;
  label: string;
  state: StepState;
}

const STATE_STYLE: Record<StepState, { ring: string; fill: string; text: string }> = {
  idle: { ring: "border-[var(--border)]", fill: "bg-[var(--panel-2)]", text: "text-[var(--text-dim)]" },
  active: { ring: "border-[var(--accent)]", fill: "bg-[var(--accent)]/20", text: "text-[var(--accent)]" },
  done: { ring: "border-emerald-500/60", fill: "bg-emerald-500/20", text: "text-emerald-400" },
  error: { ring: "border-red-500/60", fill: "bg-red-500/20", text: "text-red-400" },
};

/**
 * Animated horizontal pipeline visualizing the engineering workflow stages
 * (Parse -> Plan -> Generate -> Validate, etc). Purely presentational --
 * driven entirely by the `state` each caller passes in from data it already
 * has (loading flags, plan/log presence). No new data fetching happens here.
 */
export function PipelineStepper({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="flex items-center w-full overflow-x-auto py-1">
      {steps.map((step, i) => {
        const style = STATE_STYLE[step.state];
        const isLast = i === steps.length - 1;
        return (
          <div key={step.id} className="flex items-center flex-1 min-w-[120px]">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${style.ring} ${style.fill} ${style.text} ${
                  step.state === "active" ? "anim-step-active" : ""
                }`}
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
              <span className={`text-[10px] font-medium whitespace-nowrap ${style.text}`}>{step.label}</span>
            </div>
            {!isLast && (
              <div className="flex-1 h-[2px] mx-1 rounded-full bg-[var(--border)] relative overflow-hidden -translate-y-2.5">
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
  );
}
