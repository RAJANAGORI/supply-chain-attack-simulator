import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import type { LogEntry, ProcessRecord } from './registry/types.js';
import { buildLabEnv, resolveScenarioCwd } from './env.js';

const MAX_LOG_LINES = 5000;

type SpawnOpts = {
  label: string;
  command: string;
  args?: string[];
  cwd: string;
  scenarioId?: string;
  serviceId?: string;
  stepId?: string;
  shell?: boolean;
  env?: Record<string, string>;
  /** Also append lines into this session (e.g. run-all job dock). */
  mirrorTo?: string;
};

export class ProcessManager extends EventEmitter {
  private processes = new Map<string, { proc: ChildProcess | null; record: ProcessRecord }>();
  private logs = new Map<string, LogEntry[]>();

  list(): ProcessRecord[] {
    return Array.from(this.processes.values()).map((p) => p.record);
  }

  get(sessionId: string): ProcessRecord | undefined {
    return this.processes.get(sessionId)?.record;
  }

  getLogs(sessionId: string): LogEntry[] {
    return this.logs.get(sessionId) ?? [];
  }

  getAllLogs(): LogEntry[] {
    const all: LogEntry[] = [];
    for (const bucket of this.logs.values()) {
      all.push(...bucket);
    }
    all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return all.slice(-500);
  }

  /** Wipe buffered terminal output (and finished process records). Live children keep running with empty logs. */
  clearLogs(readyLine?: string): { clearedSessions: number } {
    const clearedSessions = this.logs.size;
    this.logs.clear();
    for (const [id, entry] of [...this.processes]) {
      if (entry.record.status === 'running') {
        this.logs.set(id, []);
      } else {
        this.processes.delete(id);
      }
    }
    this.emit('logs-cleared');
    if (readyLine) {
      this.appendLog('__system__', 'system', readyLine);
    }
    return { clearedSessions };
  }

  getActiveForScenario(scenarioId: string): ProcessRecord[] {
    return this.list().filter((p) => p.scenarioId === scenarioId && p.status === 'running');
  }

  private appendLog(sessionId: string, stream: LogEntry['stream'], line: string): void {
    const entry: LogEntry = {
      sessionId,
      timestamp: new Date().toISOString(),
      stream,
      line,
    };
    const bucket = this.logs.get(sessionId) ?? [];
    bucket.push(entry);
    if (bucket.length > MAX_LOG_LINES) bucket.splice(0, bucket.length - MAX_LOG_LINES);
    this.logs.set(sessionId, bucket);
    this.emit('log', entry);
  }

  /**
   * Spawn a process and return as soon as it is running.
   * Logs stream over the EventEmitter while the HTTP handler can return immediately.
   */
  private spawnTracked(opts: SpawnOpts): ProcessRecord {
    const sessionId = randomUUID();
    const record: ProcessRecord = {
      id: sessionId,
      scenarioId: opts.scenarioId,
      serviceId: opts.serviceId,
      stepId: opts.stepId,
      label: opts.label,
      status: 'running',
      startedAt: new Date().toISOString(),
    };

    this.logs.set(sessionId, []);
    const cmdLine = `$ ${opts.command} ${(opts.args ?? []).join(' ')}`.trim();
    this.appendLog(sessionId, 'system', cmdLine);
    if (opts.mirrorTo) this.appendLog(opts.mirrorTo, 'system', cmdLine);

    const proc = spawn(opts.command, opts.args ?? [], {
      cwd: opts.cwd,
      env: buildLabEnv({
        PYTHONUNBUFFERED: '1',
        ...opts.env,
      }),
      shell: opts.shell ?? false,
    });

    record.pid = proc.pid;
    this.processes.set(sessionId, { proc, record });

    const write = (stream: LogEntry['stream'], line: string) => {
      this.appendLog(sessionId, stream, line);
      if (opts.mirrorTo) this.appendLog(opts.mirrorTo, stream, line);
    };

    proc.stdout?.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line) write('stdout', line);
      }
    });

    proc.stderr?.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line) write('stderr', line);
      }
    });

    proc.on('error', (err) => {
      record.status = 'failed';
      record.endedAt = new Date().toISOString();
      write('system', `Process error: ${err.message}`);
      this.emit('process-end', record);
    });

    proc.on('close', (code, signal) => {
      record.endedAt = new Date().toISOString();
      record.exitCode = code;
      if (record.status === 'stopped') return;
      if (code === null) {
        record.status = 'stopped';
        write('system', signal ? `Stopped (${signal})` : 'Stopped');
        this.emit('process-end', record);
        return;
      }
      record.status = code === 0 ? 'completed' : 'failed';
      write('system', `Exited with code ${code}`);
      this.emit('process-end', record);
    });

    return record;
  }

  /** Fire-and-forget command (setup, attack steps, floci scripts). */
  runCommand(opts: SpawnOpts): ProcessRecord {
    return this.spawnTracked(opts);
  }

  /**
   * Fire-and-forget script/process — returns as soon as the child is spawned.
   * Use for long platform jobs (Floci/ES up) so HTTP proxies do not time out.
   */
  startDetached(opts: SpawnOpts): ProcessRecord {
    return this.spawnTracked(opts);
  }

  /** Wait until a session leaves the running state (completed / failed / stopped). */
  waitForSession(sessionId: string): Promise<ProcessRecord> {
    const entry = this.processes.get(sessionId);
    if (!entry) {
      return Promise.reject(new Error(`Unknown session ${sessionId}`));
    }
    if (entry.record.status !== 'running') {
      return Promise.resolve(entry.record);
    }
    return new Promise((resolve) => {
      const onEnd = (r: ProcessRecord) => {
        if (r.id === sessionId) {
          this.off('process-end', onEnd);
          resolve(r);
        }
      };
      this.on('process-end', onEnd);
    });
  }

  /**
   * Background orchestration job with its own log session (e.g. run-all).
   * Returns immediately; child process logs still emit under their own session ids.
   */
  startJob(opts: {
    label: string;
    scenarioId?: string;
    run: (ctx: {
      log: (stream: LogEntry['stream'], line: string) => void;
      waitFor: (sessionId: string) => Promise<ProcessRecord>;
    }) => Promise<void>;
  }): ProcessRecord {
    const sessionId = randomUUID();
    const record: ProcessRecord = {
      id: sessionId,
      scenarioId: opts.scenarioId,
      label: opts.label,
      status: 'running',
      startedAt: new Date().toISOString(),
    };

    this.logs.set(sessionId, []);
    this.processes.set(sessionId, { proc: null, record });
    this.appendLog(sessionId, 'system', `Job started: ${opts.label}`);

    void (async () => {
      try {
        await opts.run({
          log: (stream, line) => this.appendLog(sessionId, stream, line),
          waitFor: (id) => this.waitForSession(id),
        });
        if (record.status === 'running') {
          record.status = 'completed';
          this.appendLog(sessionId, 'system', 'Job completed');
        }
      } catch (err) {
        record.status = 'failed';
        this.appendLog(
          sessionId,
          'system',
          `Job failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      record.endedAt = new Date().toISOString();
      this.emit('process-end', record);
    })();

    return record;
  }

  startLongRunning(opts: {
    label: string;
    command: string;
    args?: string[];
    scenarioCwd: string;
    serviceCwd?: string;
    scenarioId: string;
    serviceId: string;
    port?: number;
    mirrorTo?: string;
  }): ProcessRecord {
    const cwd = resolveScenarioCwd(opts.scenarioCwd, opts.serviceCwd);
    return this.startDetached({
      label: opts.label,
      command: opts.command,
      args: opts.args,
      cwd,
      scenarioId: opts.scenarioId,
      serviceId: opts.serviceId,
      mirrorTo: opts.mirrorTo,
    });
  }

  stopSession(sessionId: string): boolean {
    const entry = this.processes.get(sessionId);
    if (!entry) return false;
    const { proc, record } = entry;
    if (proc?.pid) {
      try {
        process.kill(proc.pid, 'SIGTERM');
      } catch {
        /* already dead */
      }
    }
    if (record.status === 'running') {
      record.status = 'stopped';
      record.endedAt = new Date().toISOString();
      this.appendLog(sessionId, 'system', 'Stopped');
      this.emit('process-end', record);
    }
    return true;
  }

  stopForScenario(scenarioId: string): number {
    let stopped = 0;
    for (const [id, { record }] of this.processes) {
      if (record.scenarioId === scenarioId && record.status === 'running') {
        if (this.stopSession(id)) stopped += 1;
      }
    }
    return stopped;
  }
}

export const processManager = new ProcessManager();
