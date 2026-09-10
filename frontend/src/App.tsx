import { HashRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { ProjectProvider, useProject } from "./services/ProjectContext";
import { ToastHost } from "./components/ToastHost";
import { Dashboard } from "./pages/Dashboard";
import { Engineering } from "./pages/Engineering";
import { VirtualHmi } from "./pages/VirtualHmi";
import { Validation } from "./pages/Validation";
import { Review } from "./pages/Review";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/engineering", label: "Engineering" },
  { to: "/hmi", label: "Virtual HMI" },
  { to: "/validation", label: "Validation" },
  { to: "/review", label: "Review / Export" },
];

function Shell() {
  const { summary, validation, error, backendOnline } = useProject();
  const location = useLocation();
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
                `relative px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-white/5"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
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
