import { Router } from 'express';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { delimiter, resolve, sep } from 'node:path';
import { readArchifyBrief, resolveArchifyPack } from '../archify.js';
import { SCENARIOS, getScenario } from '../registry/scenarios.js';
import type { PlatformStatus } from '../registry/types.js';
import { processManager } from '../process-manager.js';
import { probeAct } from '../act-status.js';
import { probeFloci } from '../floci-status.js';
import { buildLabEnv, getRepoRoot, resolveScenarioCwd } from '../env.js';
import {
  dockerLabSetup,
  dockerLabStart,
  dockerLabStop,
  labBackend,
  rewriteLabUrl,
} from '../docker-labs.js';
import { loadLesson } from '../registry/lesson-loader.js';
import { buildDiffWorkbench } from '../diff-workbench.js';
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
  tickClassroomClock,
  readClassroomInjects,
  skillMatrixMarkdown,
} from '../learning-platform.js';
import { getCampaign, getCampaignStatus, listCampaignStatus, resolveInjects, buildExecutionGraph, gradeRemediation } from '../registry/campaigns.js';
import { buildAssessment } from '../assessment.js';
import { getProvenance } from '../provenance.js';
import { SubmitRejected, getChallenge, listChallenges, setDeadline, submitRule } from '../ctf/index.js';

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

  router.get('/scenarios/:id', async (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    let lesson = null;
    try {
      lesson = loadLesson(scenario);
    } catch (err) {
      console.error(`lesson load failed for ${scenario.id}:`, err);
    }
    const flociRuntime = await probeFloci(scenario.id, scenario.floci);
    res.json({
      ...scenario,
      lesson,
      processes: processManager.list().filter((p) => p.scenarioId === scenario.id),
      ...(scenario.act ? { actRuntime: probeAct() } : {}),
      flociRuntime,
    });
  });

  /** Archify diagram + brief links for a lab (served under /archify). */
  router.get('/scenarios/:id/archify', (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    res.json(resolveArchifyPack(scenario.slug));
  });

  /** Brief markdown body for Control Center rendering (not raw .md in the browser). */
  router.get('/scenarios/:id/archify/brief', (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    const brief = readArchifyBrief(scenario.slug);
    if (!brief) return res.status(404).json({ error: 'No lab brief for scenario' });
    res.json(brief);
  });

  /** Fixture trees for the lesson's Tarball-vs-Git diff workbench (in-repo text only). */
  router.get('/scenarios/:id/diff-workbench', (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    let cfg;
    try {
      cfg = loadLesson(scenario)?.diffWorkbench;
    } catch (err) {
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Lesson load failed' });
    }
    if (!cfg) return res.status(404).json({ error: 'No diff workbench for scenario' });
    const payload = buildDiffWorkbench(scenario.slug, cfg);
    if (!payload) return res.status(404).json({ error: 'Diff workbench fixtures not found' });
    res.json(payload);
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

  router.post('/campaigns/:id/exec-graph', (req, res) => {
    try {
      const campaign = getCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      const capturesByScenario = (req.body?.capturesByScenario) as Record<string, Record<string, unknown>> | undefined;
      const nodes = buildExecutionGraph(campaign, capturesByScenario || {});
      res.json({ nodes, campaign: { id: campaign.id, title: campaign.title, chapters: campaign.chapters } });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to build exec graph' });
    }
  });

  router.post('/campaigns/:id/remediation', (req, res) => {
    try {
      const campaign = getCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      const completedFlags = (req.body?.completedFlags ?? []) as string[];
      if (!campaign.remediation) return res.json({ items: [], grade: null });
      const grade = gradeRemediation(campaign.remediation, completedFlags);
      res.json({ items: campaign.remediation, grade });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load remediation' });
    }
  });

  router.post('/campaigns/:id/injects', (req, res) => {
    try {
      const campaign = getCampaign(req.params.id);
      if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
      const completedScenarios = (req.body?.completedScenarios ?? []) as string[];
      const injects = resolveInjects(campaign, completedScenarios);
      res.json({ injects, campaign: { id: campaign.id, title: campaign.title } });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to resolve injects' });
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

  /** Record a learner's decision result against a scenario's progress entry. */
  router.post('/scenarios/:id/decisions', (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    const body = req.body as {
      decisionId?: string;
      choiceId?: string;
    };
    if (!body.decisionId || !body.choiceId) {
      return res.status(400).json({ error: 'decisionId and choiceId required' });
    }

    const lesson = loadLesson(scenario);
    if (!lesson || !lesson.decisions) {
      return res.status(400).json({ error: 'No decisions defined for this scenario' });
    }

    const decision = lesson.decisions.find((d) => d.id === body.decisionId);
    if (!decision) {
      return res.status(400).json({ error: 'Decision not found in lesson' });
    }

    const choice = decision.choices.find((c) => c.id === body.choiceId);
    if (!choice) {
      return res.status(400).json({ error: 'Choice not found in decision' });
    }

    const entry: Partial<ScenarioProgressEntry> = {
      decisions: [
        {
          decisionId: decision.id,
          choiceId: choice.id,
          scoreDelta: choice.effects?.score ?? 0,
          flags: choice.effects?.flag
            ? Array.isArray(choice.effects.flag)
              ? [...(choice.effects.flag as string[])]
              : [choice.effects.flag as string]
            : [],
          answeredAt: new Date().toISOString(),
        },
      ],
    };

    res.json(mergeScenarioProgress(scenario.id, entry));
  });

  // Rule challenge (Phase 5 MVP): Sigma / Semgrep text scored offline against bundled fixtures.
  router.get('/ctf', (_req, res) => {
    res.json(listChallenges());
  });

  router.get('/ctf/:id', (req, res) => {
    const learnerId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
    const challenge = getChallenge(req.params.id, learnerId);
    if (!challenge) return res.status(404).json({ error: 'No rule challenge for this scenario' });
    res.json(challenge);
  });

  router.post('/ctf/:id/submit', (req, res) => {
    try {
      res.json(
        submitRule(req.params.id, {
          format: req.body?.format,
          rule: req.body?.rule,
          learnerId: req.body?.studentId,
        }),
      );
    } catch (err) {
      if (err instanceof SubmitRejected) {
        return res.status(err.status).json({ error: err.message, locked: err.reason });
      }
      res.status(500).json({ error: err instanceof Error ? err.message : 'Submit failed' });
    }
  });

  // Timed mode: body { minutes: 15 } starts a timer, { deadline: ISO } sets one, {} clears it.
  router.post('/ctf/:id/deadline', (req, res) => {
    if (!getChallenge(req.params.id)) return res.status(404).json({ error: 'No rule challenge for this scenario' });
    try {
      const deadline = setDeadline(req.params.id, {
        minutes: typeof req.body?.minutes === 'number' ? req.body.minutes : undefined,
        deadline: req.body?.deadline,
      });
      res.json({ scenarioId: req.params.id, deadline });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Deadline update failed' });
    }
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
      res.json(joinClassroom(code, name, req.body?.role));
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Join failed' });
    }
  });

  /** Shared tabletop clock plus the injects released so far. Learners poll this. */
  router.get('/classroom/clock', (_req, res) => {
    res.json(readClassroomInjects());
  });

  /** Instructor tick: release the next campaign inject, or just move the clock. `reset: true` rewinds to T+0. */
  router.post('/classroom/clock', (req, res) => {
    try {
      const minutes = req.body?.minutes === undefined ? undefined : Number(req.body.minutes);
      tickClassroomClock({
        campaignId: typeof req.body?.campaignId === 'string' ? req.body.campaignId : undefined,
        minutes,
        reset: Boolean(req.body?.reset),
      });
      res.json(readClassroomInjects());
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Clock tick failed' });
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
   * dependency-guard preloaded (node -r, or NODE_OPTIONS --require for npm) and reports
   * whether the attack still produced a capture. If the guard blocked the
   * malicious package, capture count stays flat and the control held.
   *
   * When the lesson declares `reversal.variant`, a second round replays a mutated
   * attacker (new package name, new payload shape, generated by
   * scenarios/_shared/polymorphic-variant.js). A static name block passes round 1 and
   * fails round 2; only a behavioral gate (allowOnly, denyDependencyEgress) holds both.
   *
   * Body (optional): { guard: ReversalGuardPolicy, seed?: number }. A learner-authored
   * guard replaces dependency-guard.json. Without it the lesson's name-only starter
   * block list is used.
   */
  router.post('/scenarios/:id/reversal', async (req, res) => {
    const scenario = getScenario(req.params.id);
    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
    const runStep =
      scenario.steps.find((s) => s.id === 'run' || s.id === 'run-bad' || s.id === 'run-ci') ??
      scenario.steps.find((s) => s.id.startsWith('run')) ??
      scenario.steps[scenario.steps.length - 1];
    if (!runStep) return res.status(400).json({ error: 'Scenario has no runnable step' });

    const countCaptures = async (): Promise<number> => {
      let n = 0;
      for (const cap of scenario.captures) {
        try {
          const r = await fetch(rewriteLabUrl(cap.url), { signal: AbortSignal.timeout(3000) });
          const body = (await r.json()) as Record<string, unknown>;
          for (const key of ['captures', 'events', 'beacons', 'publishes', 'prs'] as const) {
            const arr = body[key];
            if (Array.isArray(arr)) n += arr.length;
          }
        } catch {
          /* capture source offline */
        }
      }
      return n;
    };

    const guardPath = resolve(REPO, 'scenarios/_shared/dependency-guard.js');
    const testbenchPath = resolve(REPO, 'scenarios/_shared/testbench-env.js');
    const variantGenPath = resolve(REPO, 'scenarios/_shared/polymorphic-variant.js');
    const cwd = resolveScenarioCwd(scenario.setup.cwd, runStep.cwd);
    const lesson = loadLesson(scenario);
    const blockedPackage = lesson?.reversal?.blockedPackage?.trim();
    const variantCfg = lesson?.reversal?.variant;
    const guardFile = resolve(cwd, 'dependency-guard.json');

    let authored: ReversalGuardPolicy | null = null;
    try {
      authored = sanitizeGuardPolicy((req.body as { guard?: unknown } | undefined)?.guard);
    } catch (e) {
      return res.status(400).json({ error: e instanceof Error ? e.message : 'Invalid guard policy' });
    }
    if (authored) {
      writeFileSync(guardFile, `${JSON.stringify(authored, null, 2)}\n`);
    } else if (blockedPackage) {
      ensureGuardFile(guardFile, blockedPackage);
    }
    const policy = readGuardPolicy(guardFile);

    // `npm start` prints `node -r testbench-env.js index.js` and npm does not
    // keep a NODE_OPTIONS --require on that process. Run that node command
    // ourselves and put the guard in front of the other -r flags.
    const nodeCmd = runStep.command === 'node' || runStep.command === 'nodejs';
    const fromNpm = !nodeCmd ? nodeArgsFromNpmStart(cwd, guardPath) : null;
    const baseCommand = fromNpm?.command ?? runStep.command;
    const baseArgs = fromNpm
      ? fromNpm.args
      : nodeCmd
        ? ['-r', guardPath, ...(runStep.args ?? [])]
        : [...(runStep.args ?? [])];
    const baseEnv: Record<string, string> = { SCAS_GUARD_FILE: guardFile };
    if (!nodeCmd && !fromNpm) {
      const flag = `--require ${JSON.stringify(guardPath)}`;
      const prev = (process.env.NODE_OPTIONS ?? '').trim();
      baseEnv.NODE_OPTIONS = prev ? `${prev} ${flag}` : flag;
    }

    const runRound = async (opts: {
      id: ReversalRoundResult['id'];
      label: string;
      command: string;
      args: string[];
      env: Record<string, string>;
    }) => {
      const before = await countCaptures();
      const record = processManager.runCommand({
        label: `Reversal ${opts.id}: ${runStep.label} (guarded)`,
        command: opts.command,
        args: opts.args,
        cwd,
        scenarioId: scenario.id,
        stepId: 'reversal',
        shell: opts.id === 'baseline' ? runStep.shell : undefined,
        env: opts.env,
      });
      // Let the guarded run fire or get blocked: wait for exit (max 2.5s), then let a
      // delayed payload and the collector settle before comparing counts.
      const deadline = Date.now() + 2500;
      while (Date.now() < deadline && processManager.get(record.id)?.status === 'running') {
        await new Promise((r) => setTimeout(r, 150));
      }
      await new Promise((r) => setTimeout(r, 600));
      const after = await countCaptures();
      const logs = processManager.getLogs(record.id).map((l) => l.line).join('\n');
      const finished = processManager.get(record.id);
      const guardBlocked = logs.includes('[dependency-guard] blocked ');
      const commandOk =
        guardBlocked ||
        finished?.status === 'running' ||
        finished?.status === 'completed' ||
        finished?.exitCode === 0;
      const reason = logs.match(/\[dependency-guard\] blocked [^\n]*reason=(blocklist|allowlist|dependency-egress)/)?.[1];
      const blockedBy: ReversalRoundResult['blockedBy'] =
        reason === 'dependency-egress' ? 'egress' : (reason as 'blocklist' | 'allowlist' | undefined);
      const held = commandOk && after <= before;
      const round: ReversalRoundResult = {
        id: opts.id,
        label: opts.label,
        held,
        commandOk,
        capturesBefore: before,
        capturesAfter: after,
        ...(blockedBy ? { blockedBy } : {}),
      };
      return { round, record, guardBlocked };
    };

    const baseline = await runRound({
      id: 'baseline',
      label: 'Round 1: the attacker you already saw',
      command: baseCommand,
      args: baseArgs,
      env: baseEnv,
    });

    // Legacy single-round labs keep their original wording and shape.
    if (!variantCfg || !blockedPackage) {
      let message: string;
      if (!baseline.round.commandOk) {
        message =
          'The guarded run failed before the control could be tested. The victim command did not start. Check the terminal for the error.';
      } else if (baseline.round.held) {
        message = baseline.guardBlocked
          ? 'Your control held. The guard refused the package, so the payload did not run and no new capture landed.'
          : 'Your control held - the guarded run produced no new capture. The attack was blocked.';
      } else {
        message =
          'The attack still fired. Check that dependency-guard.json names the malicious package and sits in the victim working directory.';
      }
      return res.json({
        async: true,
        sessionId: baseline.record.id,
        record: baseline.record,
        reversal: {
          held: baseline.round.held,
          commandOk: baseline.round.commandOk,
          capturesBefore: baseline.round.capturesBefore,
          capturesAfter: baseline.round.capturesAfter,
          message,
          policy,
        },
      });
    }

    // Round 2: the attacker mutates. Skipped (graded untested) only if the fixture can't be built.
    const entryPath = resolve(cwd, variantCfg.entry);
    let attacker: ReversalRoundResult['attacker'];
    let nodePath = '';
    let variantError = '';
    if (!entryPath.startsWith(cwd + sep) || !existsSync(entryPath)) {
      variantError = `Variant entry ${variantCfg.entry} is missing from the victim directory.`;
    } else {
      try {
        const rawSeed = (req.body as { seed?: unknown } | undefined)?.seed;
        const seedArgs =
          typeof rawSeed === 'number' && Number.isInteger(rawSeed) && rawSeed >= 0
            ? ['--seed', String(rawSeed)]
            : [];
        const out = execFileSync(
          process.execPath,
          [
            variantGenPath,
            '--base', blockedPackage,
            '--port', String(variantCfg.port ?? 3000),
            '--out', resolve(cwd, '.scas-variant'),
            ...seedArgs,
          ],
          { encoding: 'utf8', timeout: 5000 },
        );
        const parsed = JSON.parse(out.trim()) as NonNullable<ReversalRoundResult['attacker']> & {
          nodePath: string;
        };
        nodePath = parsed.nodePath;
        attacker = {
          packageName: parsed.packageName,
          mutation: parsed.mutation,
          delivery: parsed.delivery,
          delayMs: parsed.delayMs,
          encoding: parsed.encoding,
          seed: parsed.seed,
        };
      } catch (e) {
        variantError = `Could not generate the mutated attacker: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    if (variantError || !attacker) {
      return res.json({
        async: true,
        sessionId: baseline.record.id,
        record: baseline.record,
        reversal: {
          held: false,
          commandOk: false,
          capturesBefore: baseline.round.capturesBefore,
          capturesAfter: baseline.round.capturesAfter,
          message: variantError || 'Mutated attacker fixture failed.',
          grade: 'untested',
          rounds: [baseline.round],
          policy,
        },
      });
    }

    const prevNodePath = (process.env.NODE_PATH ?? '').trim();
    const variant = await runRound({
      id: 'variant',
      label: `Round 2: attacker republished as ${attacker.packageName}`,
      command: 'node',
      args: ['-r', guardPath, '-r', testbenchPath, variantCfg.entry],
      env: {
        SCAS_GUARD_FILE: guardFile,
        SCAS_VARIANT_PACKAGE: attacker.packageName,
        NODE_PATH: prevNodePath ? `${nodePath}${delimiter}${prevNodePath}` : nodePath,
      },
    });
    variant.round.attacker = attacker;

    const b = baseline.round;
    const v = variant.round;
    let grade: ReversalGrade;
    let message: string;
    if (!b.commandOk || !v.commandOk) {
      grade = 'untested';
      message =
        'A guarded run failed before the control could be tested. Check the terminal for the error.';
    } else if (!b.held) {
      grade = 'failed';
      message =
        'The attack still fired in round 1. Your policy did not stop even the package you already saw. Check that dependency-guard.json is valid and names the malicious package.';
    } else if (!v.held) {
      grade = 'name-only';
      message = `Name-only block failed. Round 1 held, but the attacker republished as "${attacker.packageName}" (${attacker.mutation}, ${attacker.delivery} delivery, ${attacker.encoding} payload) and it still posted to the collector. Add a behavioral gate: allowOnly to allowlist what the app may import, or denyDependencyEgress to stop dependency code from opening connections.`;
    } else if (v.blockedBy === 'blocklist') {
      grade = 'name-only';
      message = `Round 2 held only because "${attacker.packageName}" happened to be on your block list. The attacker picks a new name each run. Add allowOnly or denyDependencyEgress so the control does not depend on guessing it.`;
    } else {
      grade = 'behavioral';
      const gate = v.blockedBy === 'egress' ? 'denyDependencyEgress gate' : 'allowOnly policy';
      message = `Behavioral control held. Round 1 and the mutated attacker "${attacker.packageName}" were both stopped, round 2 by your ${gate}. A new package name does not get past it.`;
    }

    res.json({
      async: true,
      sessionId: variant.record.id,
      record: variant.record,
      reversal: {
        held: grade === 'behavioral',
        commandOk: b.commandOk && v.commandOk,
        capturesBefore: b.capturesBefore,
        capturesAfter: v.capturesAfter,
        message,
        grade,
        nameOnlyFailed: b.held && !v.held,
        rounds: [b, v],
        policy,
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

function splitShellWords(input: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(input))) out.push(match[1] ?? match[2] ?? match[3]);
  return out;
}

/** Turn `npm start` into `node -r <guard> …` using the victim package.json start script. */
function nodeArgsFromNpmStart(
  cwd: string,
  guardPath: string,
): { command: string; args: string[] } | null {
  const pkgPath = resolve(cwd, 'package.json');
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: { start?: string } };
    const start = pkg.scripts?.start?.trim();
    if (!start) return null;
    const parts = splitShellWords(start);
    if (parts[0] !== 'node' && parts[0] !== 'nodejs') return null;
    return { command: parts[0], args: ['-r', guardPath, ...parts.slice(1)] };
  } catch {
    return null;
  }
}

/** Place the lesson block list where the guard reads it, without wiping a policy the learner already authored. */
function ensureGuardFile(file: string, blockedPackage: string): void {
  let existing: Record<string, unknown> = {};
  if (existsSync(file)) {
    try {
      const raw = JSON.parse(readFileSync(file, 'utf8')) as unknown;
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) existing = raw as Record<string, unknown>;
    } catch {
      existing = {};
    }
  }
  const names = Array.isArray(existing.block)
    ? existing.block.filter((x): x is string => typeof x === 'string')
    : [];
  if (names.includes(blockedPackage)) return;
  names.push(blockedPackage);
  writeFileSync(file, `${JSON.stringify({ ...existing, block: names }, null, 2)}\n`);
}

export interface ReversalGuardPolicy {
  block?: string[];
  allowOnly?: string[];
  denyDependencyEgress?: boolean;
  egressAllow?: string[];
}

export interface ReversalRoundResult {
  id: 'baseline' | 'variant';
  label: string;
  held: boolean;
  commandOk: boolean;
  capturesBefore: number;
  capturesAfter: number;
  blockedBy?: 'blocklist' | 'allowlist' | 'egress';
  attacker?: {
    packageName: string;
    mutation: string;
    delivery: string;
    delayMs: number;
    encoding: string;
    seed: number;
  };
}

type ReversalGrade = 'behavioral' | 'name-only' | 'failed' | 'untested';

const PKG_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;
const HOST_RE = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i;

function cleanList(raw: unknown, field: string, re: RegExp): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw) || raw.length > 50) throw new Error(`guard.${field} must be a list of up to 50 strings`);
  const out = raw.map((x) => (typeof x === 'string' ? x.trim() : ''));
  if (out.some((x) => !re.test(x))) throw new Error(`guard.${field} has an invalid entry`);
  return out;
}

/** Whitelist the learner's policy: only known keys, validated values, nothing else reaches disk. */
function sanitizeGuardPolicy(raw: unknown): ReversalGuardPolicy | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('guard must be an object');
  const g = raw as Record<string, unknown>;
  const block = cleanList(g.block, 'block', PKG_NAME_RE);
  const allowOnly = cleanList(g.allowOnly, 'allowOnly', PKG_NAME_RE);
  const egressAllow = cleanList(g.egressAllow, 'egressAllow', HOST_RE);
  const denyDependencyEgress = g.denyDependencyEgress === true;
  const policy: ReversalGuardPolicy = {
    ...(block?.length ? { block } : {}),
    ...(allowOnly?.length ? { allowOnly } : {}),
    ...(denyDependencyEgress ? { denyDependencyEgress: true } : {}),
    ...(egressAllow?.length ? { egressAllow } : {}),
  };
  if (!policy.block && !policy.allowOnly && !policy.denyDependencyEgress) {
    throw new Error('guard needs at least one of block, allowOnly or denyDependencyEgress');
  }
  return policy;
}

function readGuardPolicy(file: string): ReversalGuardPolicy | undefined {
  try {
    return sanitizeGuardPolicy(JSON.parse(readFileSync(file, 'utf8'))) ?? undefined;
  } catch {
    return undefined;
  }
}
