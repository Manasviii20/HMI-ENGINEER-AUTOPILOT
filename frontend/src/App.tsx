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
import { Builders } from "./pages/Builders";
import { Scripts } from "./pages/Scripts";
import { Migration } from "./pages/Migration";
import { Mentor } from "./pages/Mentor";
import { Logs } from "./pages/Logs";

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
function WrenchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2 2.8-2.8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
function CodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M9 8l-5 4 5 4M15 8l5 4-5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SwapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M4 7h13l-3-3M20 17H7l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M4 5h16v11H8l-4 4V5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

const TOOLS_NAV = [
  { to: "/builders", label: "Builders", icon: WrenchIcon },
  { to: "/scripts", label: "Scripts", icon: CodeIcon },
  { to: "/migration", label: "Migration", icon: SwapIcon },
  { to: "/mentor", label: "Mentor", icon: ChatIcon },
  { to: "/logs", label: "System Log", icon: ListIcon },
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
      <nav className="flex gap-1 px-6 py-1.5 border-b border-[var(--border)] bg-[var(--panel-2)] overflow-x-auto">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] flex items-center pr-2 shrink-0">
          Tools
        </span>
        {TOOLS_NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-all duration-200 ${
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
            <Route path="/builders" element={<Builders />} />
            <Route path="/scripts" element={<Scripts />} />
            <Route path="/migration" element={<Migration />} />
            <Route path="/mentor" element={<Mentor />} />
            <Route path="/logs" element={<Logs />} />
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
