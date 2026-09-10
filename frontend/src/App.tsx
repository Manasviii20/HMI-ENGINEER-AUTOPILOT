import { useEffect, type ReactNode } from "react";
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ProjectProvider, useProject } from "./services/ProjectContext";
import { ToastHost } from "./components/ToastHost";
import { ThemeToggle } from "./components/ThemeToggle";
import { useTheme } from "./hooks/useTheme";
import { WorkspaceStepper, type StageStatus, type WorkspaceStage } from "./components/WorkspaceStepper";
import { Landing } from "./pages/Landing";
import { Understanding } from "./pages/Understanding";
import { PlanReview } from "./pages/PlanReview";
import { ProjectGraph } from "./pages/ProjectGraph";
import { VirtualHmi } from "./pages/VirtualHmi";
import { Validation } from "./pages/Validation";
import { Review } from "./pages/Review";
import { DataFactory } from "./pages/DataFactory";

interface JourneyStageDef {
  n: number;
  path: string;
  label: string;
}

const JOURNEY: JourneyStageDef[] = [
  { n: 1, path: "/", label: "Input" },
  { n: 2, path: "/understand", label: "Understand" },
  { n: 3, path: "/plan", label: "Plan" },
  { n: 4, path: "/workspace/model", label: "Build" },
  { n: 5, path: "/workspace/hmi", label: "Simulate" },
  { n: 6, path: "/workspace/validation", label: "Validate" },
  { n: 7, path: "/workspace/review", label: "Export" },
];

/** Requires the journey to have reached `minStage` (i.e. a prior checkpoint
 * was approved) before rendering its children -- otherwise bounces back to
 * the start. This is what makes each stage a real gate instead of a page
 * the user could deep-link past. */
function RequireStage({ minStage, children }: { minStage: number; children: ReactNode }) {
  const { maxStage } = useProject();
  const navigate = useNavigate();
  useEffect(() => {
    if (maxStage < minStage) {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxStage]);

  if (maxStage < minStage) return null;
  return <>{children}</>;
}

function AppShell({ children }: { children: ReactNode }) {
  const { summary, validation, maxStage, backendOnline, error, resetJourney } = useProject();
  const location = useLocation();
  const [theme, toggleTheme] = useTheme();

  const currentStageN = JOURNEY.find((s) => s.path === location.pathname)?.n ?? 1;

  const stages: WorkspaceStage[] = JOURNEY.map((s) => {
    let status: StageStatus = "pending";
    if (s.n === currentStageN) status = "active";
    else if (s.n === 6 && validation && validation.status !== "PASS" && maxStage >= s.n) status = "attention";
    else if (s.n <= maxStage) status = "done";

    return {
      n: String(s.n).padStart(2, "0"),
      path: s.path,
      label: s.label,
      status,
      clickable: s.n <= maxStage,
    };
  });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--panel)] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <NavLink to="/" className="w-8 h-8 rounded bg-[var(--accent)]/15 border border-[var(--accent)]/40 flex items-center justify-center text-[var(--accent)] font-bold text-sm shrink-0">
            HE
          </NavLink>
          <div>
            <div className="font-semibold text-sm tracking-wide">{summary?.project_name ?? "HMI Engineering Autopilot"}</div>
            <div className="text-xs text-[var(--text-dim)]">
              Customer &rarr; Engineer Autopilot -- Step {currentStageN}/{JOURNEY.length}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              resetJourney();
              window.location.hash = "#/";
            }}
            className="text-xs text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors-smooth"
          >
            New Project
          </button>
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
    <AppShell>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/understand" element={<Understanding />} />
        <Route
          path="/plan"
          element={
            <RequireStage minStage={2}>
              <PlanReview />
            </RequireStage>
          }
        />
        <Route
          path="/workspace/model"
          element={
            <RequireStage minStage={4}>
              <ProjectGraph />
            </RequireStage>
          }
        />
        <Route
          path="/workspace/hmi"
          element={
            <RequireStage minStage={4}>
              <VirtualHmi />
            </RequireStage>
          }
        />
        <Route
          path="/workspace/validation"
          element={
            <RequireStage minStage={4}>
              <Validation />
            </RequireStage>
          }
        />
        <Route
          path="/workspace/review"
          element={
            <RequireStage minStage={4}>
              <>
                <Review />
                <div className="mt-6 text-center">
                  <NavLink to="/tools/factory" className="text-xs text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors-smooth">
                    Advanced: Synthetic Engineering Data Factory →
                  </NavLink>
                </div>
              </>
            </RequireStage>
          }
        />
        <Route
          path="/tools/factory"
          element={
            <RequireStage minStage={4}>
              <DataFactory />
            </RequireStage>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
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
