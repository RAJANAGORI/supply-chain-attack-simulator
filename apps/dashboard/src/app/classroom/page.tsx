'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Btn, Card, PageHeader, StatusPill } from '@/components/ui';
import { cp, type ClassroomState } from '@/lib/api';

const STUDENT_KEY = 'scas-classroom-student';

export default function ClassroomPage() {
  const [room, setRoom] = useState<ClassroomState | null>(null);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('SCAS workshop');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      setRoom(await cp.getClassroom());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load classroom');
    }
  }, []);

  useEffect(() => {
    void load();
    const saved = localStorage.getItem(STUDENT_KEY);
    if (saved) setStudentId(saved);
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
  }, [load]);

  const create = async () => {
    setBusy('create');
    try {
      const next = await cp.createClassroom(title);
      setRoom(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy('');
    }
  };

  const freeze = async (frozen: boolean) => {
    setBusy(frozen ? 'freeze' : 'unfreeze');
    try {
      setRoom(await cp.freezeClassroom(frozen));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Freeze failed');
    } finally {
      setBusy('');
    }
  };

  const join = async () => {
    setBusy('join');
    try {
      const next = await cp.joinClassroom(joinCode, joinName);
      setRoom(next);
      const me = next.students.find((s) => s.name.toLowerCase() === joinName.trim().toLowerCase());
      if (me) {
        setStudentId(me.id);
        localStorage.setItem(STUDENT_KEY, me.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Join failed');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Classroom"
        title="Classroom mode"
        description="Instructor creates a session code. Learners join on this machine (or LAN). Freeze pauses progress updates for debrief. Not multi-host isolation yet - one control plane, shared labs."
      />

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Instructor" subtitle="Create a room and share the code">
          <label className="block text-xs text-ink-muted">
            Session title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="focus-ring mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink-primary"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn disabled={!!busy} onClick={() => void create()}>
              {busy === 'create' ? 'Creating…' : 'Create session'}
            </Btn>
            {room?.code && (
              <>
                <Btn
                  variant="secondary"
                  disabled={!!busy}
                  onClick={() => void freeze(!room.frozen)}
                >
                  {room.frozen ? 'Unfreeze' : 'Freeze & discuss'}
                </Btn>
                <Btn variant="ghost" onClick={() => void load()}>
                  Refresh board
                </Btn>
              </>
            )}
          </div>
          {room?.code && (
            <div className="mt-4 rounded-xl border border-line bg-canvas-hover/50 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-ink-faint">Join code</p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-widest text-ink-primary">
                {room.code}
              </p>
              <div className="mt-2">
                <StatusPill
                  status={room.frozen ? 'warn' : 'online'}
                  label={room.frozen ? 'Frozen' : 'Live'}
                />
              </div>
            </div>
          )}
        </Card>

        <Card title="Learner join" subtitle="Same dashboard / LAN host">
          <label className="block text-xs text-ink-muted">
            Code
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="focus-ring mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 font-mono text-sm text-ink-primary"
            />
          </label>
          <label className="mt-3 block text-xs text-ink-muted">
            Display name
            <input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              className="focus-ring mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink-primary"
            />
          </label>
          <div className="mt-4">
            <Btn disabled={!!busy || !joinCode || !joinName.trim()} onClick={() => void join()}>
              {busy === 'join' ? 'Joining…' : 'Join classroom'}
            </Btn>
          </div>
          {studentId && (
            <p className="mt-3 text-xs text-ink-faint">Your student id: {studentId}</p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card
          title="Leaderboard"
          subtitle={room?.code ? `${room.students.length} joined · ${room.title}` : 'Create or join a session'}
        >
          {!room?.code || room.students.length === 0 ? (
            <p className="text-sm text-ink-muted">No students yet.</p>
          ) : (
            <ol className="divide-y divide-line">
              {[...room.students]
                .sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || b.completedSteps - a.completedSteps)
                .map((s, rank) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <span className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold ${
                          rank === 0
                            ? 'bg-brand text-white'
                            : 'bg-canvas-hover text-ink-muted'
                        }`}
                      >
                        {rank + 1}
                      </span>
                      <span className="font-medium text-ink-primary">{s.name}</span>
                    </span>
                    <span className="text-xs text-ink-muted">
                      {s.lastScenarioId ? `Lab ${s.lastScenarioId}` : '-'}
                      {s.lastStepId ? ` · ${s.lastStepId}` : ''}
                      {` · ${s.completedSteps} steps`}
                      {s.points != null && (
                        <span className="ml-2 rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 font-medium text-brand">
                          {s.points} pts
                        </span>
                      )}
                    </span>
                  </li>
                ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
