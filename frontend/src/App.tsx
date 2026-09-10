import { useEffect, type ReactNode } from "react";
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ProjectProvider, useProject } from "./services/ProjectContext";
import { ToastHost } from "./components/ToastHost";
import { ThemeToggle } from "./components/ThemeToggle";
import { useTheme } from "./hooks/useTheme";
import { WorkspaceStepper, type WorkspaceStage } from "./components/WorkspaceStepper";
import { Landing } from "./pages/Landing";
import { Pipeline } from "./pages/Pipeline";
import { Engineering } from "./pages/Engineering";
import { ProjectGraph } from "./pages/ProjectGraph";
import { VirtualHmi } from "./pages/VirtualHmi";
import { Validation } from "./pages/Validation";
import { Review } from "./pages/Review";
import { DataFactory } from "./pages/DataFactory";

function StatusChip({ label, value, tone }: { label: string; value: string; tone: "ok" | "warn" | "bad" | "neutral" }) {
  const color =
    tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : tone === "bad" ? "var(--crit)" : "var(--text-dim)";
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-[9px] uppercase tracking-wider text-[var(--text-dim)]">{label}</span>
      <span className="text-xs font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

function WorkspaceShell({ children }: { children: ReactNode }) {
  const { summary, validation, approved, exported, autopilotResult, hasSimulationActivity, backendOnline, error } =
    useProject();
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, toggleTheme] = useTheme();

  useEffect(() => {
    if (!autopilotResult) {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autopilotResult]);

  if (!autopilotResult) return null;

  const passPct = validation
    ? Math.round((validation.summary.scenarios_passed / Math.max(1, validation.summary.scenarios_total)) * 100)
    : null;

  const stages: WorkspaceStage[] = [
    { n: "01", path: "/workspace/engineering", label: "AI Engineering", status: "done" },
    { n: "02", path: "/workspace/model", label: "Project Model", status: "done" },
    { n: "03", path: "/workspace/hmi", label: "HMI & Simulation", status: hasSimulationActivity ? "done" : "pending" },
    {
      n: "04",
      path: "/workspace/validation",
      label: "Validation",
      status: !validation ? "pending" : validation.status === "PASS" ? "done" : "attention",
    },
    { n: "05", path: "/workspace/review", label: "Review & Export", status: exported ? "done" : approved ? "done" : "pending" },
  ].map((s) => ({ ...s, status: location.pathname === s.path ? "active" : s.status })) as WorkspaceStage[];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--panel)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NavLink to="/" className="w-8 h-8 rounded bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] font-bold text-sm shrink-0">
            HE
          </NavLink>
          <div>
            <div className="font-semibold text-sm tracking-wide">{summary?.project_name ?? "Project"}</div>
            <div className="text-xs text-[var(--text-dim)]">HMI Engineering Autopilot -- Engineer Workspace</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <StatusChip label="AI Engineering" value="COMPLETE" tone="ok" />
          <StatusChip
            label="Simulation"
            value={hasSimulationActivity ? "RUNNING" : "READY"}
            tone={hasSimulationActivity ? "ok" : "neutral"}
          />
          <StatusChip
            label="Validation"
            value={validation ? `${passPct}% -- ${validation.status}` : "PENDING"}
            tone={!validation ? "neutral" : validation.status === "PASS" ? "ok" : "bad"}
          />
          <StatusChip label="Review" value={exported ? "EXPORTED" : approved ? "APPROVED" : "PENDING"} tone={exported || approved ? "ok" : "neutral"} />
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/" className="text-xs text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors-smooth">
            New Project
          </NavLink>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <WorkspaceStepper stages={stages} />

      {backendOnline === false && (
        <div className="bg-red-500/10 text-red-400 text-sm px-6 py-2 border-b border-red-500/30">
          Backend API is unreachable at <span className="mono">http://localhost:8000</span>.
        </div>
      )}
      {error && backendOnline !== false && (
        <div className="bg-red-500/10 text-red-400 text-sm px-6 py-2 border-b border-red-500/30">Error: {error}</div>
      )}

      <main className="flex-1 p-6">
        <div key={location.pathname} className="anim-route-fade">
          {children}
        </div>
      </main>
      <ToastHost />
    </div>
  );
}

function Root() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pipeline" element={<Pipeline />} />
      <Route
        path="/workspace/engineering"
        element={
          <WorkspaceShell>
            <Engineering />
          </WorkspaceShell>
        }
      />
      <Route
        path="/workspace/model"
        element={
          <WorkspaceShell>
            <ProjectGraph />
          </WorkspaceShell>
        }
      />
      <Route
        path="/workspace/hmi"
        element={
          <WorkspaceShell>
            <VirtualHmi />
          </WorkspaceShell>
        }
      />
      <Route
        path="/workspace/validation"
        element={
          <WorkspaceShell>
            <Validation />
          </WorkspaceShell>
        }
      />
      <Route
        path="/workspace/review"
        element={
          <WorkspaceShell>
            <Review />
            <div className="mt-6 text-center">
              <NavLink to="/tools/factory" className="text-xs text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors-smooth">
                Advanced: Synthetic Engineering Data Factory →
              </NavLink>
            </div>
          </WorkspaceShell>
        }
      />
      <Route
        path="/tools/factory"
        element={
          <WorkspaceShell>
            <DataFactory />
          </WorkspaceShell>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <HashRouter>
        <Root />
      </HashRouter>
    </ProjectProvider>
  );
}
