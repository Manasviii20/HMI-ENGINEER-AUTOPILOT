const BASE = "/api";

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

export interface Tag {
  name: string;
  data_type: string;
  unit?: string | null;
  description?: string | null;
  source?: string | null;
}

export interface HmiObject {
  id: string;
  object_type: string;
  tag?: string | null;
  label?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Screen {
  id: string;
  name: string;
  objects: HmiObject[];
}

export interface Alarm {
  id: string;
  name: string;
  tag: string;
  condition: string;
  threshold: number;
  severity: string;
}

export interface NavigationLink {
  from_screen: string;
  to_screen: string;
  label?: string | null;
}

export interface Project {
  project: { name: string; version: string; description?: string | null };
  tags: Tag[];
  screens: Screen[];
  alarms: Alarm[];
  navigation: NavigationLink[];
  scripts: unknown[];
  dependencies: { source: string; target: string; relation: string }[];
}

export interface ProjectSummary {
  project_name: string;
  tag_count: number;
  screen_count: number;
  object_count: number;
  alarm_count: number;
  navigation_count: number;
  dependency_count: number;
  tags: string[];
  screens: string[];
  alarms: string[];
}

export interface GraphNode {
  id: string;
  kind: string;
  [k: string]: unknown;
}
export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  [k: string]: unknown;
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface EngineeringAction {
  action: string;
  screen?: string | null;
  object_id?: string | null;
  object_type?: string | null;
  tag?: string | null;
  label?: string | null;
  alarm?: string | null;
  threshold?: number | null;
  condition?: string | null;
  severity?: string | null;
  from_screen?: string | null;
  to_screen?: string | null;
  reason?: string | null;
}

export interface EngineeringPlan {
  summary: string;
  actions: EngineeringAction[];
  unknowns: string[];
}

export interface ApplyLogEntry {
  action: string;
  status: "APPLIED" | "REJECTED" | "SKIPPED";
  reason?: string;
  [k: string]: unknown;
}

export interface ValidationIssue {
  id: string;
  type: string;
  severity: string;
  message: string;
  screen?: string;
  object?: string;
}

export interface ScenarioResult {
  scenario: string;
  status: "PASS" | "FAILED";
  fired_alarms: string[];
  expected_alarms: string[];
  issues: string[];
}

export interface ValidationResult {
  status: "PASS" | "FAILED";
  structural_issues: ValidationIssue[];
  scenario_results: ScenarioResult[];
  summary: { structural_issue_count: number; scenarios_passed: number; scenarios_total: number };
}

export interface SelfCorrectionResult {
  cycles: { cycle: number; status: string; actions: ApplyLogEntry[] }[];
  final_status: "PASS" | "FAILED";
  final_validation: ValidationResult;
}

export const api = {
  loadProject: (project_id = "demo") =>
    req<{ project_id: string; summary: ProjectSummary }>("/projects/load", {
      method: "POST",
      body: JSON.stringify({ project_id }),
    }),

  getProject: (project_id = "demo") =>
    req<{ project: Project; summary: ProjectSummary }>(`/projects/${project_id}`),

  getGraph: (project_id = "demo") => req<GraphData>(`/projects/${project_id}/graph`),

  plan: (requirement: string, project_id = "demo") =>
    req<{ plan: EngineeringPlan; mock_mode: boolean }>("/engineering/plan", {
      method: "POST",
      body: JSON.stringify({ project_id, requirement }),
    }),

  apply: (plan: EngineeringPlan, project_id = "demo") =>
    req<{ log: ApplyLogEntry[]; project: Project; summary: ProjectSummary }>("/engineering/apply", {
      method: "POST",
      body: JSON.stringify({ project_id, plan }),
    }),

  simulationStart: (project_id = "demo") =>
    req<{ status: string; state: Record<string, unknown> }>("/simulation/start", {
      method: "POST",
      body: JSON.stringify({ project_id }),
    }),

  simulationScenario: (scenario: string, project_id = "demo") =>
    req<{ scenario: string; state: Record<string, unknown>; tags: Record<string, unknown> }>(
      "/simulation/scenario",
      { method: "POST", body: JSON.stringify({ project_id, scenario }) }
    ),

  getValidation: (project_id = "demo") => req<ValidationResult>(`/validation?project_id=${project_id}`),

  autofix: (project_id = "demo") =>
    req<SelfCorrectionResult>("/autofix", { method: "POST", body: JSON.stringify({ project_id }) }),

  breakBinding: (object_id: string, project_id = "demo") =>
    req<{ status: string; object_id: string }>("/demo/break-binding", {
      method: "POST",
      body: JSON.stringify({ project_id, object_id }),
    }),

  approve: (project_id = "demo") =>
    req<{ status: string; project_id: string }>("/review/approve", {
      method: "POST",
      body: JSON.stringify({ project_id }),
    }),

  exportProject: (project_id = "demo") =>
    req<{ status: string; files: string[]; zip: string; approved: boolean }>(
      `/export?project_id=${project_id}`
    ),

  downloadUrl: () => `${BASE}/export/download`,
};

export function simulationSocket(onMessage: (data: any) => void): WebSocket {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${window.location.host}/api/ws/simulation`);
  ws.onmessage = (ev) => {
    try {
      onMessage(JSON.parse(ev.data));
    } catch {
      /* ignore */
    }
  };
  return ws;
}
