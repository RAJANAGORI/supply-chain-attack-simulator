'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { LogConsole } from '@/components/LogConsole';
import { useLabSession } from '@/components/LabSessionContext';
import { cp } from '@/lib/api';

type Orientation = 'vertical' | 'bottom';

const ORIENT_KEY = 'scas.dock.orient';
const WIDTH_KEY = 'scas.dock.width';
const HEIGHT_KEY = 'scas.dock.height';
const COLLAPSED_KEY = 'scas.dock.collapsed';

const MIN_W = 260;
const MAX_W_RATIO = 0.58;
const DEFAULT_W = 360;
const MIN_H = 120;
const MAX_H_RATIO = 0.7;
const DEFAULT_H = 240;
const COLLAPSED_W = 44;
const COLLAPSED_H = 44;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function readOrient(): Orientation {
  if (typeof window === 'undefined') return 'vertical';
  return window.sessionStorage.getItem(ORIENT_KEY) === 'bottom' ? 'bottom' : 'vertical';
}

function readWidth(): number {
  if (typeof window === 'undefined') return DEFAULT_W;
  const n = Number(window.sessionStorage.getItem(WIDTH_KEY));
  return Number.isFinite(n) && n >= MIN_W ? n : DEFAULT_W;
}

function readHeight(): number {
  if (typeof window === 'undefined') return DEFAULT_H;
  const n = Number(window.sessionStorage.getItem(HEIGHT_KEY));
  return Number.isFinite(n) && n >= MIN_H ? n : DEFAULT_H;
}

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  const v = window.sessionStorage.getItem(COLLAPSED_KEY);
  return v === null ? false : v === '1';
}

/**
 * Labs workspace: content + live terminal with drag-to-resize.
 * Default: vertical split (content left, terminal right).
 */
export function LabsWorkspace({ children }: { children: ReactNode }) {
  const { sessionId, followAll, setFollowAll, labId } = useLabSession();
  const [collapsed, setCollapsed] = useState(false);
  const [orient, setOrient] = useState<Orientation>('vertical');
  const [width, setWidth] = useState(DEFAULT_W);
  const [height, setHeight] = useState(DEFAULT_H);
  const [clearKey, setClearKey] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ start: number; size: number } | null>(null);
  const useVerticalRef = useRef(true);
  const activeSession = followAll ? undefined : sessionId;

  useEffect(() => {
    setOrient(readOrient());
    setWidth(readWidth());
    setHeight(readHeight());
    setCollapsed(readCollapsed());
    setHydrated(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(ORIENT_KEY, orient);
  }, [orient, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(WIDTH_KEY, String(Math.round(width)));
  }, [width, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(HEIGHT_KEY, String(Math.round(height)));
  }, [height, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed, hydrated]);

  useEffect(() => {
    if (sessionId) setCollapsed(false);
  }, [sessionId]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const maxWidth = () => Math.floor(window.innerWidth * MAX_W_RATIO);
  const maxHeight = () => Math.floor(window.innerHeight * MAX_H_RATIO);

  const startDrag = useCallback(
    (e: ReactPointerEvent, mode: 'vertical' | 'bottom') => {
      if (collapsed) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      dragRef.current = {
        start: mode === 'vertical' ? e.clientX : e.clientY,
        size: mode === 'vertical' ? width : height,
      };
      setDragging(true);
    },
    [collapsed, width, height],
  );

  const useVertical = !narrow && orient === 'vertical';
  useVerticalRef.current = useVertical;

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (useVerticalRef.current) {
        const delta = d.start - e.clientX;
        setWidth(clamp(d.size + delta, MIN_W, maxWidth()));
      } else {
        const delta = d.start - e.clientY;
        setHeight(clamp(d.size + delta, MIN_H, maxHeight()));
      }
    };
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [dragging]);

  const panePx = useVertical
    ? collapsed
      ? COLLAPSED_W
      : width
    : collapsed
      ? COLLAPSED_H
      : height;

  const statusLabel = (() => {
    const lab = labId ? `Lab ${labId}` : 'Labs';
    if (sessionId && !followAll) return `${lab} · ${sessionId.slice(0, 8)}`;
    if (followAll) return `${lab} · all sessions`;
    return lab;
  })();

  const setPreset = (kind: 'sm' | 'md' | 'lg') => {
    if (useVertical) {
      const map = { sm: 280, md: 360, lg: 480 } as const;
      setWidth(clamp(map[kind], MIN_W, maxWidth()));
    } else {
      const map = { sm: 160, md: 240, lg: 360 } as const;
      setHeight(clamp(map[kind], MIN_H, maxHeight()));
    }
  };

  return (
    <div
      className={`fixed inset-0 left-0 z-20 flex bg-canvas md:left-[var(--scas-sidebar-w,15rem)] ${
        useVertical ? 'flex-row' : 'flex-col'
      } ${dragging ? 'select-none' : ''}`}
    >
      <div className="@container min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="w-full min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-8">{children}</div>
      </div>

      {/* Drag handle */}
      {!collapsed && (
        <div
          role="separator"
          aria-orientation={useVertical ? 'vertical' : 'horizontal'}
          aria-valuenow={Math.round(panePx)}
          aria-label={useVertical ? 'Resize terminal width' : 'Resize terminal height'}
          tabIndex={0}
          onPointerDown={(e) => startDrag(e, useVertical ? 'vertical' : 'bottom')}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 40 : 16;
            if (useVertical) {
              if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setWidth((w) => clamp(w + step, MIN_W, maxWidth()));
              } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setWidth((w) => clamp(w - step, MIN_W, maxWidth()));
              }
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHeight((h) => clamp(h + step, MIN_H, maxHeight()));
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHeight((h) => clamp(h - step, MIN_H, maxHeight()));
            }
          }}
          className={`group relative z-40 shrink-0 bg-line/80 transition-colors hover:bg-brand ${
            useVertical
              ? `w-1.5 cursor-col-resize ${dragging ? 'bg-brand' : ''}`
              : `h-1.5 cursor-row-resize ${dragging ? 'bg-brand' : ''}`
          }`}
        >
          <span
            className={`pointer-events-none absolute rounded-full bg-white/40 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100 ${
              useVertical
                ? 'left-1/2 top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2'
                : 'left-1/2 top-1/2 h-1 w-10 -translate-x-1/2 -translate-y-1/2'
            }`}
          />
        </div>
      )}

      <aside
        className={`z-30 flex shrink-0 flex-col bg-[#0c0b14] ${
          useVertical ? 'h-full border-l border-white/5' : 'w-full border-t border-white/5'
        } ${dragging ? '' : 'transition-[width,height] duration-150 ease-out'}`}
        style={useVertical ? { width: panePx } : { height: panePx }}
        aria-label="Live lab output"
      >
        <div
          className={`flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 sm:px-4 ${
            useVertical && collapsed ? 'h-full flex-col py-3' : 'h-11'
          }`}
        >
          {useVertical && collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex h-full w-full flex-col items-center gap-3 rounded-lg py-2 text-white/70 hover:bg-white/5 hover:text-white"
              aria-expanded={false}
              title="Expand live output"
            >
              <span
                className={`inline-flex h-2 w-2 rounded-full ${sessionId ? 'bg-emerald-400' : 'bg-white/35'}`}
              />
              <span
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                Live output
              </span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="flex min-w-0 items-center gap-2.5 rounded-lg px-1 py-1 text-left hover:bg-white/5"
                aria-expanded={!collapsed}
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  {sessionId ? (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50 opacity-75" />
                  ) : null}
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      sessionId ? 'bg-emerald-400' : 'bg-white/35'
                    }`}
                  />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-widest text-white/45">
                    Live output
                  </span>
                  <span className="block truncate text-xs text-white/60">{statusLabel}</span>
                </span>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                {!collapsed && (
                  <>
                    <button
                      type="button"
                      onClick={() => setFollowAll(true)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                        followAll ? 'bg-brand text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    {sessionId ? (
                      <button
                        type="button"
                        onClick={() => setFollowAll(false)}
                        className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                          !followAll ? 'bg-brand text-white' : 'text-white/50 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        Run
                      </button>
                    ) : null}
                    {!narrow && (
                      <div
                        className="hidden items-center rounded-md bg-white/5 p-0.5 lg:flex"
                        role="group"
                        aria-label="Split direction"
                      >
                        <button
                          type="button"
                          onClick={() => setOrient('vertical')}
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            orient === 'vertical' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                          }`}
                          aria-pressed={orient === 'vertical'}
                        >
                          Side
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrient('bottom')}
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            orient === 'bottom' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'
                          }`}
                          aria-pressed={orient === 'bottom'}
                        >
                          Bottom
                        </button>
                      </div>
                    )}
                    <div className="hidden items-center rounded-md bg-white/5 p-0.5 sm:flex" role="group" aria-label="Pane size presets">
                      {(['sm', 'md', 'lg'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPreset(s)}
                          className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40 hover:text-white"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void cp.clearLogs().catch(() => undefined);
                        setClearKey((k) => k + 1);
                      }}
                      className="hidden rounded-md px-2 py-1 text-[11px] text-white/40 transition hover:bg-white/10 hover:text-white sm:inline"
                    >
                      Clear
                    </button>
                    <Link
                      href="/teardown"
                      className="hidden rounded-md px-2 py-1 text-[11px] text-white/40 transition hover:bg-white/10 hover:text-rose-300 sm:inline"
                    >
                      Reset
                    </Link>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => !c)}
                  className="rounded-md px-2.5 py-1 text-[11px] font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                  aria-expanded={!collapsed}
                >
                  {collapsed ? 'Expand' : 'Collapse'}
                </button>
              </div>
            </>
          )}
        </div>

        {!collapsed && (
          <div className="min-h-0 flex-1 overflow-hidden">
            <LogConsole
              key={clearKey}
              sessionId={activeSession}
              fill
              hideChrome
              className="h-full rounded-none border-0 shadow-none"
            />
          </div>
        )}
      </aside>
    </div>
  );
}
