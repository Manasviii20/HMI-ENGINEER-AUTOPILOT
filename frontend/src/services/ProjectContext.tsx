import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, type Project, type ProjectSummary, type ValidationResult } from "./api";

export interface ActivityEntry {
  id: number;
  ts: number;
  stage: "plan" | "generate" | "correction" | "simulation" | "manual";
  text: string;
}

interface ProjectContextValue {
  projectId: string;
  project: Project | null;
  summary: ProjectSummary | null;
  validation: ValidationResult | null;
  approved: boolean;
  loading: boolean;
  error: string | null;
  backendOnline: boolean | null; // null = not checked yet
  activity: ActivityEntry[];
  exported: boolean;
  hasEngineeringActivity: boolean;
  hasCorrectionActivity: boolean;
  hasSimulationActivity: boolean;
  refreshProject: () => Promise<void>;
  refreshValidation: () => Promise<void>;
  setApproved: (v: boolean) => void;
  pushActivity: (stage: ActivityEntry["stage"], text: string) => void;
  setExported: (v: boolean) => void;
}

const Ctx = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [approved, setApprovedState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [exported, setExported] = useState(false);
  const projectId = "demo";
  const initialized = useRef(false);
  const activityId = useRef(0);

  const refreshProject = useCallback(async () => {
    const res = await api.getProject(projectId);
    setProject(res.project);
    setSummary(res.summary);
    setApprovedState(res.approved);
  }, []);

  const refreshValidation = useCallback(async () => {
    const res = await api.getValidation(projectId);
    setValidation(res);
  }, []);

  const pushActivity = useCallback((stage: ActivityEntry["stage"], text: string) => {
    activityId.current += 1;
    setActivity((prev) => [{ id: activityId.current, ts: Date.now(), stage, text }, ...prev].slice(0, 30));
  }, []);

  useEffect(() => {
    // React StrictMode double-invokes effects in dev; guard so we only
    // load once per mount and don't race two concurrent /projects/load calls.
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        await api.health();
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
      try {
        await api.loadProject(projectId);
        await refreshProject();
        await refreshValidation();
        setBackendOnline(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setBackendOnline(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshProject, refreshValidation]);

  const hasEngineeringActivity = activity.some((a) => a.stage === "generate");
  const hasCorrectionActivity = activity.some((a) => a.stage === "correction");
  const hasSimulationActivity = activity.some((a) => a.stage === "simulation");

  return (
    <Ctx.Provider
      value={{
        projectId,
        project,
        summary,
        validation,
        approved,
        loading,
        error,
        backendOnline,
        activity,
        exported,
        hasEngineeringActivity,
        hasCorrectionActivity,
        hasSimulationActivity,
        refreshProject,
        refreshValidation,
        setApproved: setApprovedState,
        pushActivity,
        setExported,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useProject() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
