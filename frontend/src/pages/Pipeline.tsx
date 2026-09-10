import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProject } from "../services/ProjectContext";

const CAPTIONS = [
  "Reading your requirement...",
  "Identifying machine assets...",
  "Engineering tags, screens and alarms...",
  "Wiring navigation and bindings...",
  "Starting the virtual machine...",
  "Running validation checks...",
  "Finishing up...",
];

const MIN_DISPLAY_MS = 3200;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Purely decorative industrial "engineering in progress" scene -- a belt
 * feeding parts into a rotating gear stack while HMI tiles assemble
 * themselves on the right. Reuses the app's existing CSS animation
 * primitives (belt-dash / spin / pulse-glow) rather than a canned lottie. */
function EngineeringScene() {
  return (
    <svg viewBox="0 0 480 220" width="100%" height="220" className="max-w-lg">
      <rect x="10" y="150" width="200" height="10" rx="5" fill="var(--panel-2)" stroke="var(--border)" />
      <line
        x1="14" y1="155" x2="206" y2="155"
        stroke="var(--accent)" strokeWidth="3" strokeDasharray="10 8"
        className="anim-belt"
      />
      {[40, 90, 140].map((x, i) => (
        <rect
          key={x}
          x={x} y="132" width="18" height="18" rx="3"
          fill="var(--accent-2)"
          className="anim-pop-in"
          style={{ animationDelay: `${i * 0.5}s`, animationDuration: "1.5s", animationIterationCount: "infinite" }}
        />
      ))}

      <g transform="translate(250,120)">
        <circle r="46" fill="none" stroke="var(--border)" strokeWidth="10" />
        <g className="anim-spin-slow" style={{ color: "var(--accent)" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <rect
              key={i}
              x={-4} y={-58} width={8} height={20} rx={2}
              fill="currentColor"
              transform={`rotate(${i * 45})`}
            />
          ))}
          <circle r="30" fill="var(--panel)" stroke="currentColor" strokeWidth="4" />
        </g>
        <circle r="10" fill="var(--accent)" className="anim-pulse" />
      </g>

      <g transform="translate(340,60)">
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={i * 46} y={0} width={38} height={26} rx={4}
            fill="var(--panel-2)" stroke="var(--accent)" strokeWidth="1.5"
            className="anim-rise-in"
            style={{ animationDelay: `${1 + i * 0.4}s` }}
          />
        ))}
      </g>
      <g transform="translate(340,96)">
        {[0, 1].map((i) => (
          <rect
            key={i}
            x={i * 70} y={0} width={62} height={26} rx={4}
            fill="var(--panel-2)" stroke="var(--ok)" strokeWidth="1.5"
            className="anim-rise-in"
            style={{ animationDelay: `${1.8 + i * 0.4}s` }}
          />
        ))}
      </g>
    </svg>
  );
}

export function Pipeline() {
  const location = useLocation() as { state?: { requirement?: string } };
  const navigate = useNavigate();
  const { runAutopilot } = useProject();
  const [captionIndex, setCaptionIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const requirement = location.state?.requirement;
    if (!requirement) {
      navigate("/", { replace: true });
      return;
    }
    if (started.current) return;
    started.current = true;

    const captionTimer = setInterval(() => {
      setCaptionIndex((i) => Math.min(i + 1, CAPTIONS.length - 1));
    }, 700);

    (async () => {
      try {
        await Promise.all([runAutopilot(requirement), delay(MIN_DISPLAY_MS)]);
        navigate("/workspace/engineering", { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        clearInterval(captionTimer);
      }
    })();

    return () => clearInterval(captionTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 anim-rise-in">
        <EngineeringScene />
        {error ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-red-400 text-sm max-w-md">{error}</div>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded border border-[var(--accent)] text-[var(--accent)] text-sm font-semibold hover:bg-[var(--accent)]/10 transition-all duration-150"
            >
              Back to Start
            </button>
          </div>
        ) : (
          <>
            <div className="text-lg font-semibold">Engineering your HMI</div>
            <div key={captionIndex} className="text-sm text-[var(--text-dim)] anim-rise-in">
              {CAPTIONS[captionIndex]}
            </div>
            <div className="w-64 h-1 rounded-full bg-[var(--panel-2)] overflow-hidden relative">
              <div
                className="absolute inset-y-0 left-0 w-1/3 rounded-full anim-progress-bar"
                style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
