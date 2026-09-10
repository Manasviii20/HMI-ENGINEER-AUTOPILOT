import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  api,
  type EngineeringPlan,
  type ApplyLogEntry,
  type Project,
  type ProjectSummary,
  type SelfCorrectionResult,
  type ValidationResult,
} from "./api";

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
  hasSimulationActivity: boolean;

  // Guided-journey state
  requirement: string;
  plan: EngineeringPlan | null;
  planMockMode: boolean;
  buildLog: ApplyLogEntry[] | null;
  correction: SelfCorrectionResult | null;
  built: boolean;
  graphApproved: boolean;
  maxStage: number;

  refreshProject: () => Promise<void>;
  refreshValidation: () => Promise<void>;
  setApproved: (v: boolean) => void;
  pushActivity: (stage: ActivityEntry["stage"], text: string) => void;
  setExported: (v: boolean) => void;

  startUnderstanding: (requirement: string) => Promise<EngineeringPlan>;
  buildProject: () => Promise<void>;
  setGraphApproved: (v: boolean) => void;
  advanceStage: (n: number) => void;
  resetJourney: () => void;
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

  const [requirement, setRequirement] = useState("");
  const [plan, setPlan] = useState<EngineeringPlan | null>(null);
  const [planMockMode, setPlanMockMode] = useState(false);
  const [buildLog, setBuildLog] = useState<ApplyLogEntry[] | null>(null);
  const [correction, setCorrection] = useState<SelfCorrectionResult | null>(null);
  const [built, setBuilt] = useState(false);
  const [graphApproved, setGraphApproved] = useState(false);
  const [maxStage, setMaxStage] = useState(1);

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

  const advanceStage = useCallback((n: number) => {
    setMaxStage((prev) => Math.max(prev, n));
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

  const startUnderstanding = useCallback(
    async (req: string) => {
      setRequirement(req);
      setPlan(null);
      setBuildLog(null);
      setCorrection(null);
      setBuilt(false);
      setGraphApproved(false);
      setExported(false);
      setApprovedState(false);

      // A fresh journey always starts from the clean baseline project so
      // re-runs (or a second requirement) don't inherit stale engineering.
      await api.loadProject(projectId);
      await refreshProject();

      const res = await api.plan(req, projectId);
      setPlan(res.plan);
      setPlanMockMode(res.mock_mode);
      advanceStage(2);
      pushActivity("plan", `AI understood the requirement: "${req.slice(0, 60)}${req.length > 60 ? "..." : ""}"`);
      return res.plan;
    },
    [refreshProject, advanceStage, pushActivity]
  );

  const buildProject = useCallback(async () => {
    if (!plan) throw new Error("No approved plan to build from");

    const applyRes = await api.apply(plan, projectId);
    setBuildLog(applyRes.log);
    await refreshProject();

    let val = await api.getValidation(projectId);
    let corr: SelfCorrectionResult | null = null;
    if (val.status !== "PASS") {
      corr = await api.autofix(projectId);
      setCorrection(corr);
      val = corr.final_validation;
    }
    setValidation(val);

    await api.simulationStart(projectId);

    const appliedCount = applyRes.log.filter((l) => l.status === "APPLIED").length;
    pushActivity("generate", `AI engineering complete: ${appliedCount}/${applyRes.log.length} action(s) applied`);
    if (corr) {
      pushActivity(
        "correction",
        `AI self-correction ran ${corr.cycles.length} cycle(s) -- final status ${corr.final_status}`
      );
    }
    pushActivity("simulation", "Virtual machine simulation started");

    setBuilt(true);
    advanceStage(4);
  }, [plan, refreshProject, advanceStage, pushActivity]);

  const resetJourney = useCallback(() => {
    setRequirement("");
    setPlan(null);
    setBuildLog(null);
    setCorrection(null);
    setBuilt(false);
    setGraphApproved(false);
    setExported(false);
    setApprovedState(false);
    setMaxStage(1);
  }, []);

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
        hasSimulationActivity,

        requirement,
        plan,
        planMockMode,
        buildLog,
        correction,
        built,
        graphApproved,
        maxStage,

        refreshProject,
        refreshValidation,
        setApproved: setApprovedState,
        pushActivity,
        setExported,

        startUnderstanding,
        buildProject,
        setGraphApproved,
        advanceStage,
        resetJourney,
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
