import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, type Project, type ProjectSummary, type ValidationResult } from "./api";

interface ProjectContextValue {
  projectId: string;
  project: Project | null;
  summary: ProjectSummary | null;
  validation: ValidationResult | null;
  approved: boolean;
  loading: boolean;
  error: string | null;
  refreshProject: () => Promise<void>;
  refreshValidation: () => Promise<void>;
  setApproved: (v: boolean) => void;
}

const Ctx = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project | null>(null);
  const [summary, setSummary] = useState<ProjectSummary | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [approved, setApproved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const projectId = "demo";

  const refreshProject = useCallback(async () => {
    const res = await api.getProject(projectId);
    setProject(res.project);
    setSummary(res.summary);
  }, []);

  const refreshValidation = useCallback(async () => {
    const res = await api.getValidation(projectId);
    setValidation(res);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await api.loadProject(projectId);
        await refreshProject();
        await refreshValidation();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshProject, refreshValidation]);

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
        refreshProject,
        refreshValidation,
        setApproved,
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
