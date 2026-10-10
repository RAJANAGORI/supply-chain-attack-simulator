export interface ScenarioService {
  id: string;
  label: string;
  command: string;
  args?: string[];
  cwd?: string;
  port?: number;
}

export interface ScenarioStep {
  id: string;
  label: string;
  command: string;
  args?: string[];
  cwd?: string;
  shell?: boolean;
}

export interface ScenarioCapture {
  id: string;
  label: string;
  url: string;
  clearUrl?: string;
}

export interface ScenarioFloci {
  seed?: string;
  verify?: string;
}

/** Learner-facing description of a nektos/act lab (05, 25). */
export interface ScenarioActMap {
  /** The uses: line as it appears in the workflow. */
  uses: string;
  /** Folder act binds that ref to. */
  local: string;
  /** Why this binding exists. */
  why: string;
}

export interface ScenarioActRunner {
  tool: 'nektos/act';
  /** Workflow path relative to the scenario directory. */
  workflow: string;
  summary: string;
  maps: ScenarioActMap[];
  fallback: string;
}

export interface ScenarioDefinition {
  id: string;
  slug: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  ports: number[];
  setup: { command: string; cwd: string };
  services: ScenarioService[];
  steps: ScenarioStep[];
  captures: ScenarioCapture[];
  floci?: ScenarioFloci;
  /** Present only for labs whose attack step runs a workflow through nektos/act. */
  act?: ScenarioActRunner;
  docs: { readme: string; detect: string };
}

export interface ProcessRecord {
  id: string;
  scenarioId?: string;
  serviceId?: string;
  stepId?: string;
  label: string;
  pid?: number;
  status: 'running' | 'stopped' | 'failed' | 'completed';
  startedAt: string;
  endedAt?: string;
  exitCode?: number | null;
}

export interface LogEntry {
  sessionId: string;
  timestamp: string;
  stream: 'stdout' | 'stderr' | 'system';
  line: string;
}

export interface PlatformStatus {
  controlPlane: { ok: boolean; port: number };
  elasticsearch: { ok: boolean; url: string };
  kibana: { ok: boolean; url: string };
  floci: { ok: boolean; url: string };
  portConflicts: number[];
}
