import { HashRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { ProjectProvider, useProject } from "./services/ProjectContext";
import { ToastHost } from "./components/ToastHost";
import { ThemeToggle } from "./components/ThemeToggle";
import { useTheme } from "./hooks/useTheme";
import { Dashboard } from "./pages/Dashboard";
import { Engineering } from "./pages/Engineering";
import { VirtualHmi } from "./pages/VirtualHmi";
import { Validation } from "./pages/Validation";
import { Review } from "./pages/Review";

function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function CpuIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="6" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="10" y="10" width="4" height="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function MonitorIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function ShieldCheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ClipboardCheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="17" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M9 3h6v3H9z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 13l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV = [
  { to: "/", label: "Dashboard", icon: GridIcon },
  { to: "/engineering", label: "Engineering", icon: CpuIcon },
  { to: "/hmi", label: "Virtual HMI", icon: MonitorIcon },
  { to: "/validation", label: "Validation", icon: ShieldCheckIcon },
  { to: "/review", label: "Review / Export", icon: ClipboardCheckIcon },
];

function Shell() {
  const { summary, validation, error, backendOnline } = useProject();
  const location = useLocation();
  const [theme, toggleTheme] = useTheme();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--panel)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] font-bold text-sm transition-transform duration-300 hover:rotate-6 hover:scale-110">
            HE
          </div>
          <div>
            <div className="font-semibold text-sm tracking-wide">HMI Engineering Autopilot</div>
            <div className="text-xs text-[var(--text-dim)]">
              {summary?.project_name ?? "Loading project..."}
            </div>
          </div>
        </div>
        <nav className="flex gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `relative flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--accent)]/5"
                }`
              }
            >
              <n.icon />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-dim)]">Validation:</span>
            <span
              key={validation?.status}
              className={`px-2 py-0.5 rounded font-semibold border transition-colors-smooth anim-pop-in flex items-center gap-1.5 ${
                validation?.status === "PASS"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                  : validation?.status === "FAILED"
                  ? "bg-red-500/15 text-red-400 border-red-500/40"
                  : "bg-[var(--panel-2)] text-[var(--text-dim)] border-[var(--border)]"
              }`}
            >
              {validation?.status && (
                <span
                  className={`status-dot ${validation.status === "PASS" ? "" : "anim-flash"}`}
                  style={{ background: "currentColor" }}
                />
              )}
              {validation?.status ?? "..."}
            </span>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>
      {backendOnline === false && (
        <div className="bg-red-500/10 text-red-400 text-sm px-6 py-2 border-b border-red-500/30">
          Backend API is unreachable at <span className="mono">http://localhost:8000</span>. Start it with{" "}
          <span className="mono">uvicorn backend.main:app --reload --port 8000</span> — buttons won't work
          until it's running.
        </div>
      )}
      {error && backendOnline !== false && (
        <div className="bg-red-500/10 text-red-400 text-sm px-6 py-2 border-b border-red-500/30">
          Error: {error}
        </div>
      )}
      <main className="flex-1 p-6">
        <div key={location.pathname} className="anim-route-fade">
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/engineering" element={<Engineering />} />
            <Route path="/hmi" element={<VirtualHmi />} />
            <Route path="/validation" element={<Validation />} />
            <Route path="/review" element={<Review />} />
          </Routes>
        </div>
      </main>
      <ToastHost />
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </ProjectProvider>
  );
}
