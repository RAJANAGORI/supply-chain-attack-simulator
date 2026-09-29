'use client';

import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '@/lib/api';
import { cp } from '@/lib/api';

interface LogConsoleProps {
  sessionId?: string;
  className?: string;
  tall?: boolean;
  /** Fill parent height (for docked terminal). */
  fill?: boolean;
  /** Hide the built-in header (dock supplies its own). */
  hideChrome?: boolean;
}

export function LogConsole({
  sessionId,
  className = '',
  tall,
  fill,
  hideChrome,
}: LogConsoleProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [lines, setLines] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setLines([]);
    const ws = new WebSocket(sessionId ? `${cp.wsUrl()}?session=${sessionId}` : cp.wsUrl());

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as LogEntry & { type?: string };
        if (msg.type === 'logs-cleared') {
          setLines([]);
          return;
        }
        setLines((prev) => [...prev.slice(-799), msg]);
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      } catch {
        /* ignore */
      }
    };

    cp.logs(sessionId).then((initial) => setLines(initial.slice(-300))).catch(() => {});

    return () => ws.close();
  }, [sessionId]);

  const streamColor = (stream: LogEntry['stream']) => {
    if (stream === 'stderr') return 'text-rose-300';
    if (stream === 'system') return 'text-amber-300';
    return 'text-white/80';
  };

  return (
    <div
      className={`relative flex flex-col overflow-hidden bg-[#0c0b14] text-[#e8e6f5] ${
        hideChrome ? '' : 'rounded-2xl border border-line shadow-panel'
      } ${fill ? 'h-full min-h-0' : ''} ${className}`}
    >
      {!hideChrome && (
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">Terminal</p>
            <p className="text-[11px] text-white/40">
              {sessionId ? `Session ${sessionId.slice(0, 8)}…` : 'All active sessions'}
            </p>
          </div>
          <span className={`flex items-center gap-1.5 text-[11px] ${connected ? 'text-state-ok' : 'text-white/40'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-state-ok' : 'bg-white/30'}`} />
            {connected ? 'Live' : 'Connecting…'}
          </span>
        </div>
      )}
      <div
        className={`min-h-0 overflow-x-auto overflow-y-auto px-3 py-3 font-mono leading-relaxed sm:px-4 ${
          fill ? 'flex-1 text-xs sm:text-[13px] sm:leading-6' : tall ? 'h-[420px] text-[11px] leading-5' : 'h-56 text-[11px] leading-5'
        }`}
      >
        {lines.length === 0 ? (
          <p className="text-white/35">
            Waiting for output… Start a lab action above — logs stream here live.
          </p>
        ) : (
          lines.map((entry, i) => (
            <div key={`${entry.sessionId}-${entry.timestamp}-${i}`} className={streamColor(entry.stream)}>
              <span className="text-white/35">[{entry.timestamp.slice(11, 19)}]</span> {entry.line}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
