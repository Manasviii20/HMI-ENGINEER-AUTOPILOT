import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../services/ProjectContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTheme } from "../hooks/useTheme";

interface Example {
  label: string;
  text: string;
}

const EXAMPLES: Example[] = [
  {
    label: "Packaging Line",
    text: "Automated packaging line with a conveyor and motor. Add a motor overview screen with speed, temperature and overload status, plus a high temperature alarm above 85.",
  },
  {
    label: "Conveyor Sorting System",
    text: "Conveyor system with jam and overload protection. Show conveyor run status and the product sensor on the dashboard.",
  },
  {
    label: "Emergency Stop Safety",
    text: "Add an emergency stop indicator to the dashboard and an alarm for when the emergency stop is pressed.",
  },
  {
    label: "Motor Health Monitoring",
    text: "Create a motor health screen with a speed trend, a temperature gauge and overload status, accessible from the main navigation.",
  },
  {
    label: "Communication Watchdog",
    text: "Monitor PLC communication health and raise an alarm on communication loss.",
  },
  {
    label: "Temperature Trend",
    text: "Add a temperature trend chart for the motor and an alarm when temperature exceeds 90.",
  },
  {
    label: "Product Flow Monitor",
    text: "Show the product sensor and conveyor run status together on a new Flow Overview screen.",
  },
  {
    label: "Overload Protection",
    text: "Add overload protection: alarm when motor overload is active, and show it on the dashboard.",
  },
  {
    label: "Bottle Filling Line",
    text: "Bottle filling line built on a motor and conveyor. Add a fill line status screen with speed and run indicators.",
  },
  {
    label: "Full Safety Panel",
    text: "Create a Safety screen showing emergency stop, motor overload and PLC communication status, with an alarm for each.",
  },
  {
    label: "Speed & Alarm Overview",
    text: "Add a speed gauge for the motor and a high speed alarm above 100.",
  },
  {
    label: "Water Pumping Station",
    text: "Pumping-station style line with motor run status and an overload protection alarm on the dashboard.",
  },
];

export function Landing() {
  const { backendOnline } = useProject();
  const [requirement, setRequirement] = useState("");
  const [theme, toggleTheme] = useTheme();
  const navigate = useNavigate();

  function start() {
    const text = requirement.trim();
    if (!text) return;
    navigate("/pipeline", { state: { requirement: text } });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] font-bold text-sm">
            HE
          </div>
          <span className="font-semibold text-sm tracking-wide">HMI Engineering Autopilot</span>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      {backendOnline === false && (
        <div className="bg-red-500/10 text-red-400 text-sm px-6 py-2 border-y border-red-500/30 text-center">
          Backend API is unreachable at <span className="mono">http://localhost:8000</span>. Start it with{" "}
          <span className="mono">uvicorn backend.main:app --reload --port 8000</span> before engineering a project.
        </div>
      )}

      <main className="flex-1 flex flex-col items-center px-6 py-10 md:py-16">
        <div className="w-full max-w-2xl flex flex-col items-center text-center anim-rise-in">
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--accent)] font-semibold mb-3">
            HMI Engineering Autopilot
          </span>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
            From Machine Requirement<br />to Validated HMI
          </h1>
          <p className="text-[var(--text-dim)] text-sm md:text-base mb-8 max-w-xl">
            Describe the machine or process you want. The autopilot engineers the tags, screens,
            alarms, navigation and simulation for you — then hands you a validated project to review.
          </p>

          <div className="card w-full p-5 text-left">
            <label className="text-xs uppercase tracking-wider text-[var(--text-dim)] font-semibold">
              What are you building?
            </label>
            <textarea
              className="w-full h-32 mt-2 bg-[var(--panel-2)] border border-[var(--border)] rounded p-3 text-sm resize-none focus:outline-none focus:border-[var(--accent)] transition-colors-smooth"
              placeholder='e.g. "Automated bottle filling line with 3 motors, level sensor, temperature monitoring and alarms."'
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-[var(--text-dim)]">
                {requirement.trim() ? `${requirement.trim().length} characters` : "Pick an example below or write your own"}
              </span>
              <button
                onClick={start}
                disabled={!requirement.trim() || backendOnline === false}
                className="px-6 py-2.5 rounded bg-[var(--accent)] text-[#03121c] font-semibold text-sm hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-40"
              >
                Start Engineering →
              </button>
            </div>
          </div>
        </div>

        <div className="w-full max-w-4xl mt-12">
          <div className="text-xs uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-3 text-center">
            Or start from an example
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {EXAMPLES.map((ex, i) => (
              <button
                key={ex.label}
                onClick={() => setRequirement(ex.text)}
                className="card p-3 text-left text-xs hover:border-[var(--accent)]/50 hover:-translate-y-0.5 transition-all duration-150 anim-rise-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="font-semibold mb-1">{ex.label}</div>
                <div className="text-[var(--text-dim)] line-clamp-2">{ex.text}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-4xl mt-14">
          <div className="text-xs uppercase tracking-wider text-[var(--text-dim)] font-semibold mb-4 text-center">
            How it works
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { n: "1", t: "Describe", d: "Tell the autopilot what machine or process you need in plain language." },
              { n: "2", t: "AI Engineers It", d: "The autopilot builds the tags, screens, alarms, navigation and simulation." },
              { n: "3", t: "Review & Export", d: "You review the validated HMI, request changes, approve and export it." },
            ].map((s) => (
              <div key={s.n} className="card p-4 flex flex-col gap-1.5">
                <span className="w-7 h-7 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/40 text-[var(--accent)] text-xs font-bold flex items-center justify-center">
                  {s.n}
                </span>
                <div className="text-sm font-semibold mt-1">{s.t}</div>
                <div className="text-xs text-[var(--text-dim)]">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
