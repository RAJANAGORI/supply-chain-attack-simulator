import { Router } from 'express';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { SCENARIOS, getScenario } from '../registry/scenarios.js';
import type { PlatformStatus } from '../registry/types.js';
import { processManager } from '../process-manager.js';
import { buildLabEnv, getRepoRoot, resolveScenarioCwd } from '../env.js';
import {
  dockerLabSetup,
  dockerLabStart,
  dockerLabStop,
  labBackend,
  rewriteLabUrl,
} from '../docker-labs.js';
import { loadLesson } from '../registry/lesson-loader.js';
import { evaluateLessonSteps } from '../lesson-verify.js';
import { mergeScenarioProgress, readProgress, resetProgress, writeProgress } from '../progress.js';
import type { ProgressState, ScenarioProgressEntry } from '../registry/lesson-types.js';
import {
  askLabAssistant,
  buildBriefing,
  buildSkillMatrix,
  createClassroom,
  fetchEsTimeline,
  joinClassroom,
  readClassroom,
  reportClassroomProgress,
  resetClassroomLearnerProgress,
  setClassroomFrozen,
  skillMatrixMarkdown,
} from '../learning-platform.js';
import { getCampaignStatus, listCampaignStatus } from '../registry/campaigns.js';
import { buildAssessment } from '../assessment.js';
import { getProvenance } from '../provenance.js';

const REPO = getRepoRoot();

function platformHost(): string {
  return process.env.SCAS_PLATFORM_HOST || '127.0.0.1';
}

async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(rewriteLabUrl(url), { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.once('error', () => resolvePort(true));
    server.once('listening', () => {
      server.close();
      resolvePort(false);
    });
    // Match mock servers that bind :::PORT (dual-stack), not only 127.0.0.1
    server.listen(port, '0.0.0.0');
  });
}

function runScript(scriptPath: string, args: string[] = []): Promise<{ code: number | null; output: string }> {
  return new Promise((resolveScript) => {
    const proc = spawn('bash', [scriptPath, ...args], {
      cwd: REPO,
      env: buildLabEnv(),
    });
    let output = '';
    proc.stdout.on('data', (c) => { output += c.toString(); });
    proc.stderr.on('data', (c) => { output += c.toString(); });
    proc.on('close', (code) => resolveScript({ code, output }));
  });
}

/** Stop tracked mocks on these ports, then kill orphans. Awaits until bind is free (or retry). */
async function freeLabPorts(ports: number[]): Promise<{ port: number; output: string; stillBusy: boolean }[]> {
  const unique = [...new Set(ports.filter((p) => Number.isFinite(p) && p > 0))];
  for (const proc of processManager.list()) {
    if (proc.status !== 'running' || !proc.scenarioId || proc.scenarioId === 'platform') continue;
    const scenario = getScenario(proc.scenarioId);
    if (!scenario) continue;
    if (scenario.ports.some((p) => unique.includes(p))) {
      processManager.stopSession(proc.id);
    }
  }
  // Let SIGTERM land before lsof/kill -9 (avoids racing a dying listener)
  if (unique.length > 0) {
    await new Promise((r) => setTimeout(r, 200));
  }

  const scriptPath = resolve(REPO, 'scripts/setup/kill-port.sh');
  const results: { port: number; output: string; stillBusy: boolean }[] = [];
  for (const port of unique) {
    const first = await runScript(scriptPath, [String(port)]);
    await new Promise((r) => setTimeout(r, 150));
    let stillBusy = await checkPort(port);
    let output = first.output.trim();
    if (stillBusy) {
      const retry = await runScript(scriptPath, [String(port)]);
      await new Promise((r) => setTimeout(r, 250));
      stillBusy = await checkPort(port);
      output = `${output}\n${retry.output}`.trim();
    }
    results.push({ port, output, stillBusy });
  }
  return results;
}

export function createApiRouter(): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    const ports = [3000, 3001, 3002, 3003, 3015, 3016, 3017, 3018, 3019, 3020, 3021, 3022, 3023, 4873, 4874, 4566, 9200, 5601];
    const conflicts: number[] = [];
    for (const port of ports) {
      if (await checkPort(port)) conflicts.push(port);
    }
    res.json({ ok: true, port: Number(process.env.CONTROL_PLANE_PORT ?? 3101), portConflicts: conflicts });
  });

  router.get('/provenance', (_req, res) => {
    res.json(getProvenance());
  });

  router.get('/scenarios', (_req, res) => {
    const list = SCENARIOS.map((s) => {
      let lessonSummary = null;
      try {
        const lesson = loadLesson(s);
        if (lesson) {
          lessonSummary = {
            etaMinutes: lesson.etaMinutes,
            category: lesson.category,
            stepCount: lesson.steps.length,
          };
        }
      } catch (err) {
        console.error(`lesson load failed for ${s.id}:`, err);
      }
      return {
        ...s,
        lesson: lessonSummary,
        activeProcesses: processManager.getActiveForScenario(s.id).length,
      };
    });
    res.json(list);
  });

  router.get('/scenarios/:id', (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    let lesson = null;
    try {
      lesson = loadLesson(scenario);
    } catch (err) {
      console.error(`lesson load failed for ${scenario.id}:`, err);
    }
    res.json({
      ...scenario,
      lesson,
      processes: processManager.list().filter((p) => p.scenarioId === scenario.id),
    });
  });

  router.get('/scenarios/:id/lesson/verify', async (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    const lesson = loadLesson(scenario);
    if (!lesson) return res.status(404).json({ error: 'No lesson for scenario' });

    const captures: Record<string, unknown> = {};
    for (const cap of scenario.captures) {
      try {
        const response = await fetch(rewriteLabUrl(cap.url), { signal: AbortSignal.timeout(3000) });
        captures[cap.id] = await response.json();
      } catch (err) {
        captures[cap.id] = { error: err instanceof Error ? err.message : 'Fetch failed' };
      }
    }

    const processes = processManager.list().filter((p) => p.scenarioId === scenario.id);
    const steps = evaluateLessonSteps(lesson, { scenario, processes, captures });
    res.json({ steps, captures });
  });

  router.get('/progress', (_req, res) => {
    res.json(readProgress());
  });

  router.delete('/progress', (_req, res) => {
    res.json(resetProgress());
  });

  router.put('/progress', (req, res) => {
    const body = req.body as Partial<ProgressState> & {
      scenarioId?: string;
      entry?: Partial<ScenarioProgressEntry> & { lastStepId?: string };
    };

    if (body.scenarioId && body.entry) {
      return res.json(mergeScenarioProgress(body.scenarioId, body.entry));
    }

    if (body.scenarios) {
      return res.json(
        writeProgress({
          lastScenarioId: body.lastScenarioId,
          lastStepId: body.lastStepId,
          scenarios: body.scenarios,
          updatedAt: new Date().toISOString(),
        }),
      );
    }

    return res.status(400).json({ error: 'Expected scenarioId+entry or full scenarios map' });
  });

  router.get('/skills', (_req, res) => {
    res.json(buildSkillMatrix());
  });

  router.get('/skills/export', (req, res) => {
    const format = String(req.query.format ?? 'json');
    if (format === 'md' || format === 'markdown') {
      res.type('text/markdown').send(skillMatrixMarkdown());
      return;
    }
    res.json(buildSkillMatrix());
  });

  router.get('/briefing', (req, res) => {
    const scenarioId = typeof req.query.scenario === 'string' ? req.query.scenario : undefined;
    res.json(buildBriefing(scenarioId));
  });

  router.get('/campaigns', (_req, res) => {
    try {
      res.json(listCampaignStatus());
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load campaigns' });
    }
  });

  router.get('/campaigns/:id', (req, res) => {
    try {
      const status = getCampaignStatus(req.params.id);
      if (!status) return res.status(404).json({ error: 'Campaign not found' });
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load campaign' });
    }
  });

  router.get('/assessment', (_req, res) => {
    res.json(buildAssessment());
  });

  // Record a quiz or drill outcome against a scenario's progress entry.
  router.post('/scenarios/:id/assessment', (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    const body = req.body as {
      quiz?: { score: number; total: number };
      drill?: { picked: number; correct: boolean };
    };
    const entry: Partial<ScenarioProgressEntry> = {};
    if (body.quiz && Number.isFinite(body.quiz.score) && Number.isFinite(body.quiz.total)) {
      entry.quiz = {
        score: Math.max(0, Math.floor(body.quiz.score)),
        total: Math.max(1, Math.floor(body.quiz.total)),
        passedAt: new Date().toISOString(),
      };
    }
    if (body.drill && Number.isFinite(body.drill.picked)) {
      entry.drill = {
        picked: Math.floor(body.drill.picked),
        correct: Boolean(body.drill.correct),
        answeredAt: new Date().toISOString(),
      };
    }
    if (!entry.quiz && !entry.drill) {
      return res.status(400).json({ error: 'Expected quiz or drill result' });
    }
    res.json(mergeScenarioProgress(scenario.id, entry));
  });

  router.get('/observe/timeline', async (req, res) => {
    const limit = Number(req.query.limit ?? 50);
    res.json(await fetchEsTimeline(Number.isFinite(limit) ? limit : 50));
  });

  router.get('/classroom', (_req, res) => {
    res.json(readClassroom());
  });

  router.post('/classroom', (req, res) => {
    const title = typeof req.body?.title === 'string' ? req.body.title : 'SCAS classroom';
    res.json(createClassroom(title));
  });

  router.post('/classroom/freeze', (req, res) => {
    try {
      const frozen = Boolean(req.body?.frozen ?? true);
      res.json(setClassroomFrozen(frozen));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Freeze failed' });
    }
  });

  router.post('/classroom/join', (req, res) => {
    try {
      const code = String(req.body?.code ?? '');
      const name = String(req.body?.name ?? 'Learner');
      res.json(joinClassroom(code, name));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Join failed' });
    }
  });

  router.post('/classroom/progress', (req, res) => {
    try {
      const studentId = String(req.body?.studentId ?? '');
      if (!studentId) return res.status(400).json({ error: 'studentId required' });
      res.json(
        reportClassroomProgress(studentId, {
          lastScenarioId: req.body?.lastScenarioId,
          lastStepId: req.body?.lastStepId,
          completedSteps: req.body?.completedSteps,
          points: req.body?.points,
        }),
      );
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Progress update failed' });
    }
  });

  router.post('/assistant', async (req, res) => {
    try {
      const result = await askLabAssistant({
        question: String(req.body?.question ?? ''),
        scenarioId: typeof req.body?.scenarioId === 'string' ? req.body.scenarioId : undefined,
        stepId: typeof req.body?.stepId === 'string' ? req.body.stepId : undefined,
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Assistant failed' });
    }
  });

  router.post('/scenarios/:id/setup', (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    if (labBackend() === 'docker') {
      try {
        const record = dockerLabSetup(scenario);
        return res.json({ async: true, started: true, sessionId: record.id, record, backend: 'docker' });
      } catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Docker setup failed' });
      }
    }
    const record = processManager.runCommand({
      label: `Setup ${scenario.title}`,
      command: 'bash',
      args: [scenario.setup.command.replace('./', '')],
      cwd: scenario.setup.cwd,
      scenarioId: scenario.id,
      stepId: 'setup',
      shell: false,
    });
    res.json({ async: true, started: true, sessionId: record.id, record, backend: 'host' });
  });

  router.post('/scenarios/:id/services/start', async (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    if (labBackend() === 'docker') {
      try {
        const record = dockerLabStart(scenario);
        return res.json({
          async: true,
          started: [record],
          sessions: [record.id],
          sessionId: record.id,
          backend: 'docker',
        });
      } catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Docker start failed' });
      }
    }

    // Early labs share :3000. Free overlapping mocks/orphans before bind.
    const freed = await freeLabPorts(scenario.ports);
    const blocked = freed.filter((f) => f.stillBusy);
    if (blocked.length > 0) {
      return res.status(409).json({
        error: `Port(s) still busy after free: ${blocked.map((b) => b.port).join(', ')}. Click Free :${blocked[0].port} or Reset lab.`,
        freed,
      });
    }

    const started = scenario.services.map((service) =>
      processManager.startLongRunning({
        label: service.label,
        command: service.command,
        args: service.args,
        scenarioCwd: scenario.setup.cwd,
        serviceCwd: service.cwd,
        scenarioId: scenario.id,
        serviceId: service.id,
        port: service.port,
      }),
    );
    res.json({
      async: true,
      started,
      sessions: started.map((r) => r.id),
      sessionId: started[0]?.id,
      backend: 'host',
      freed,
      message: `Started services after freeing ports: ${scenario.ports.join(', ')}`,
    });
  });

  router.post('/scenarios/:id/services/stop', async (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    if (labBackend() === 'docker') {
      try {
        const record = dockerLabStop(scenario);
        return res.json({ stopped: [record.id], async: true, sessionId: record.id, backend: 'docker' });
      } catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : 'Docker stop failed' });
      }
    }
    const stopped = processManager.stopForScenario(scenario.id);
    await Promise.all(
      scenario.ports.map((port) => runScript(resolve(REPO, 'scripts/setup/kill-port.sh'), [String(port)])),
    );
    res.json({ stopped, async: false, backend: 'host' });
  });

  router.post('/scenarios/:id/steps/:stepId', (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    const step = scenario.steps.find((s) => s.id === req.params.stepId);
    if (!step) return res.status(404).json({ error: 'Step not found' });
    const cwd = resolveScenarioCwd(scenario.setup.cwd, step.cwd);
    const record = processManager.runCommand({
      label: step.label,
      command: step.command,
      args: step.args,
      cwd,
      scenarioId: scenario.id,
      stepId: step.id,
      shell: step.shell,
    });
    res.json({ async: true, started: true, sessionId: record.id, record });
  });

  router.post('/scenarios/:id/run', (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });

    if (labBackend() === 'docker') {
      const job = processManager.startJob({
        label: `Docker lab ${scenario.title}`,
        scenarioId: scenario.id,
        run: async ({ log, waitFor }) => {
          log('system', 'Docker backend — build + up (setup embedded in image)');
          const up = dockerLabStart(scenario);
          const result = await waitFor(up.id);
          if (result.status !== 'completed') {
            throw new Error(`Docker compose up failed (exit ${result.exitCode ?? 'null'})`);
          }
          log('system', 'Lab stack is up. Use dashboard steps or: docker compose exec victim bash');
        },
      });
      return res.json({ async: true, started: true, sessionId: job.id, sessions: [job.id], backend: 'docker' });
    }

    const job = processManager.startJob({
      label: `Full lab ${scenario.title}`,
      scenarioId: scenario.id,
      run: async ({ log, waitFor }) => {
        const mirrorTo = job.id;
        log('system', 'Phase 1/3 — setup');
        const setup = processManager.runCommand({
          label: `Setup ${scenario.title}`,
          command: 'bash',
          args: [scenario.setup.command.replace('./', '')],
          cwd: scenario.setup.cwd,
          scenarioId: scenario.id,
          stepId: 'setup',
          mirrorTo,
        });
        const setupResult = await waitFor(setup.id);
        if (setupResult.status !== 'completed') {
          throw new Error(`Setup failed (exit ${setupResult.exitCode ?? 'null'})`);
        }

        log('system', 'Phase 2/3 — starting services');
        for (const service of scenario.services) {
          processManager.startLongRunning({
            label: service.label,
            command: service.command,
            args: service.args,
            scenarioCwd: scenario.setup.cwd,
            serviceCwd: service.cwd,
            scenarioId: scenario.id,
            serviceId: service.id,
            port: service.port,
            mirrorTo,
          });
        }
        // Brief settle so mocks bind ports before attack steps
        await new Promise((r) => setTimeout(r, 400));

        log('system', 'Phase 3/3 — attack steps');
        for (const step of scenario.steps) {
          log('system', `→ ${step.label}`);
          const cwd = resolveScenarioCwd(scenario.setup.cwd, step.cwd);
          const stepRecord = processManager.runCommand({
            label: step.label,
            command: step.command,
            args: step.args,
            cwd,
            scenarioId: scenario.id,
            stepId: step.id,
            shell: step.shell,
            mirrorTo,
          });
          const stepResult = await waitFor(stepRecord.id);
          if (stepResult.status !== 'completed') {
            throw new Error(`Step failed: ${step.label} (exit ${stepResult.exitCode ?? 'null'})`);
          }
        }
      },
    });

    res.json({ async: true, started: true, sessionId: job.id, sessions: [job.id], backend: 'host' });
  });

  router.get('/scenarios/:id/captures', async (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    const results: Record<string, unknown> = {};
    for (const cap of scenario.captures) {
      try {
        const response = await fetch(rewriteLabUrl(cap.url), { signal: AbortSignal.timeout(3000) });
        results[cap.id] = await response.json();
      } catch (err) {
        results[cap.id] = { error: err instanceof Error ? err.message : 'Fetch failed' };
      }
    }
    res.json(results);
  });

  router.delete('/scenarios/:id/captures', async (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    const results: Record<string, unknown> = {};
    for (const cap of scenario.captures) {
      if (!cap.clearUrl) continue;
      try {
        const response = await fetch(rewriteLabUrl(cap.clearUrl), {
          method: 'DELETE',
          signal: AbortSignal.timeout(3000),
        });
        results[cap.id] = await response.json();
      } catch (err) {
        results[cap.id] = { error: err instanceof Error ? err.message : 'Clear failed' };
      }
    }
    res.json(results);
  });

  router.post('/scenarios/:id/floci/:action', (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario?.floci) return res.status(404).json({ error: 'Floci not configured for scenario' });
    const script = req.params.action === 'seed' ? scenario.floci.seed : scenario.floci.verify;
    if (!script) return res.status(404).json({ error: 'Floci action not found' });
    const cwd = resolveScenarioCwd(scenario.setup.cwd);
    const record = processManager.runCommand({
      label: `Floci ${req.params.action}`,
      command: 'bash',
      args: [script],
      cwd,
      scenarioId: scenario.id,
    });
    res.json({ async: true, started: true, sessionId: record.id, record });
  });

  /**
   * Purple-team reversal. Re-runs the scenario's "run" step with the learner's
   * dependency-guard preloaded (node -r _shared/dependency-guard.js) and reports
   * whether the attack still produced a capture. If the guard blocked the
   * malicious package, capture count stays flat and the control held.
   */
  router.post('/scenarios/:id/reversal', async (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    const runStep = scenario.steps.find((s) => s.id === 'run') ?? scenario.steps[scenario.steps.length - 1];
    if (!runStep) return res.status(400).json({ error: 'Scenario has no runnable step' });

    const countCaptures = async (): Promise<number> => {
      let n = 0;
      for (const cap of scenario.captures) {
        try {
          const r = await fetch(rewriteLabUrl(cap.url), { signal: AbortSignal.timeout(3000) });
          const body = (await r.json()) as Record<string, unknown>;
          for (const key of ['captures', 'events', 'beacons'] as const) {
            const arr = body[key];
            if (Array.isArray(arr)) n += arr.length;
          }
        } catch {
          /* capture source offline */
        }
      }
      return n;
    };

    const before = await countCaptures();
    const guardPath = resolve(REPO, 'scenarios/_shared/dependency-guard.js');
    const cwd = resolveScenarioCwd(scenario.setup.cwd, runStep.cwd);

    // Prepend the guard to any existing -r preloads so both apply.
    const args = ['-r', guardPath, ...(runStep.args ?? [])];
    const record = processManager.runCommand({
      label: `Reversal: ${runStep.label} (guarded)`,
      command: runStep.command,
      args,
      cwd,
      scenarioId: scenario.id,
      stepId: 'reversal',
      shell: runStep.shell,
    });

    // Give the guarded run a moment to either fire or be blocked, then compare.
    await new Promise((r) => setTimeout(r, 2500));
    const after = await countCaptures();
    const held = after <= before;

    res.json({
      async: true,
      sessionId: record.id,
      record,
      reversal: {
        held,
        capturesBefore: before,
        capturesAfter: after,
        message: held
          ? 'Your control held - the guarded run produced no new capture. The attack was blocked.'
          : 'The attack still fired. Check that dependency-guard.json names the malicious package and sits in the victim working directory.',
      },
    });
  });

  router.get('/platform/status', async (_req, res) => {
    // Lab/scenario ports only — do not flag ES/Kibana/Floci as "conflicts" when the stack owns them
    const labPorts = [3000, 3001, 3002, 3003, 3015, 3016, 3017, 3018, 3019, 3020, 3021, 3022, 3023, 4873, 4874];
    const [portHits, elasticsearchOk, kibanaOk, flociOk] = await Promise.all([
      Promise.all(labPorts.map(async (port) => ((await checkPort(port)) ? port : null))),
      probe(`http://${platformHost()}:9200`),
      probe(`http://${platformHost()}:5601/api/status`),
      probe(`http://${platformHost()}:4566/_floci/health`),
    ]);
    const status: PlatformStatus = {
      controlPlane: { ok: true, port: Number(process.env.CONTROL_PLANE_PORT ?? 3101) },
      elasticsearch: { ok: elasticsearchOk, url: `http://${platformHost()}:9200` },
      kibana: { ok: kibanaOk, url: `http://${platformHost()}:5601` },
      floci: { ok: flociOk, url: `http://${platformHost()}:4566` },
      portConflicts: portHits.filter((p): p is number => p !== null),
    };
    res.json(status);
  });

  async function startPlatformScript(
    res: import('express').Response,
    label: string,
    scriptRel: string,
    args: string[] = [],
  ) {
    const scriptPath = resolve(REPO, scriptRel);
    const record = processManager.startDetached({
      label,
      command: 'bash',
      args: [scriptPath, ...args],
      cwd: REPO,
      scenarioId: 'platform',
      serviceId: label,
    });
    res.json({
      started: true,
      async: true,
      sessionId: record.id,
      label: record.label,
      message: `${label} started in the background. Watch the Labs terminal dock for logs.`,
    });
  }

  router.post('/platform/elasticsearch/:action', async (req, res) => {
    if (req.params.action === 'up') {
      return startPlatformScript(res, 'Elasticsearch up', 'scripts/observability/elasticsearch-up.sh');
    }
    if (req.params.action === 'down') {
      return startPlatformScript(res, 'Elasticsearch down', 'scripts/observability/elasticsearch-down.sh');
    }
    return res.status(400).json({ error: 'Unknown action' });
  });

  router.post('/platform/floci/:action', async (req, res) => {
    const map: Record<string, { label: string; script: string; args?: string[] }> = {
      // --auto: published native image when CPU has ARM LSE; else JVM build (Pi 4 / Cortex-A72)
      setup: { label: 'Floci setup', script: 'scripts/floci/floci-setup.sh', args: ['--auto'] },
      up: { label: 'Floci up', script: 'scripts/floci/floci-up.sh' },
      down: { label: 'Floci down', script: 'scripts/floci/floci-down.sh' },
      status: { label: 'Floci status', script: 'scripts/floci/floci-status.sh' },
    };
    const entry = map[req.params.action];
    if (!entry) return res.status(400).json({ error: 'Unknown action' });
    // status is quick — keep sync for a small JSON reply
    if (req.params.action === 'status') {
      const result = await runScript(resolve(REPO, entry.script), entry.args ?? []);
      return res.json(result);
    }
    return startPlatformScript(res, entry.label, entry.script, entry.args ?? []);
  });

  /** Free a lab port (default :3000). Awaits kill so the next Start services can bind. */
  router.post('/platform/ports/free', async (req, res) => {
    const raw = req.body?.port ?? 3000;
    const port = typeof raw === 'number' ? raw : Number(String(raw).replace(/^:/, ''));
    if (!Number.isFinite(port) || port <= 0) {
      return res.status(400).json({ error: 'port must be a positive number' });
    }

    const [result] = await freeLabPorts([port]);
    if (result?.stillBusy) {
      return res.status(409).json({
        ok: false,
        port,
        output: result.output,
        message: `Port :${port} is still busy. Try Reset lab or: ./scripts/setup/kill-port.sh ${port}`,
      });
    }

    return res.json({
      ok: true,
      started: false,
      async: false,
      port,
      output: result?.output ?? '',
      message: `Port :${port} is free. Labs 01-05 and 07-12 share :3000 — Start services when ready.`,
    });
  });

  router.post('/platform/teardown', (_req, res) => {
    // Stop tracked lab children first so teardown does not need to kill our own PIDs.
    for (const proc of processManager.list()) {
      if (proc.status !== 'running') continue;
      if (proc.scenarioId && proc.scenarioId !== 'platform') {
        processManager.stopSession(proc.id);
      }
    }

    // Zero learner state immediately (ports/files cleaned by teardown.sh async).
    const progress = resetProgress();
    const classroom = resetClassroomLearnerProgress();

    const scriptPath = resolve(REPO, 'scripts/setup/teardown.sh');
    const record = processManager.startDetached({
      label: 'Lab teardown',
      command: 'bash',
      args: [scriptPath],
      cwd: REPO,
      scenarioId: 'platform',
      serviceId: 'Lab teardown',
    });
    const onEnd = (ended: { id: string }) => {
      if (ended.id !== record.id) return;
      processManager.off('process-end', onEnd);
      // Fresh terminal after reset — drop teardown + lab history.
      processManager.clearLogs('Environment reset. Labs, progress, and terminal are clear — start a lab when ready.');
    };
    processManager.on('process-end', onEnd);
    return res.json({
      started: true,
      async: true,
      sessionId: record.id,
      label: record.label,
      progress,
      classroom,
      message:
        'Reset started: progress wiped, classroom learner stats cleared, lab ports/captures/node_modules will be cleaned. Terminal clears when teardown finishes.',
    });
  });

  router.delete('/logs', (_req, res) => {
    const result = processManager.clearLogs();
    res.json({ ok: true, ...result });
  });

  router.post('/logs/clear', (_req, res) => {
    const result = processManager.clearLogs();
    res.json({ ok: true, ...result });
  });

  router.get('/logs', (req, res) => {
    const sessionId = req.query.session as string | undefined;
    if (sessionId) {
      return res.json(processManager.getLogs(sessionId));
    }
    res.json(processManager.getAllLogs());
  });

  router.get('/processes', (_req, res) => {
    res.json(processManager.list());
  });

  return router;
}
