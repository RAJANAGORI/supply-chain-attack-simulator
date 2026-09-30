'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

const SIDEBAR_KEY = 'scas-sidebar-collapsed';
const EXPANDED_W = '15rem'; // w-60
const COLLAPSED_W = '4.75rem';

const mainNav = [
  { href: '/welcome', label: 'Welcome', icon: '◈' },
  { href: '/', label: 'Overview', icon: '▣' },
  { href: '/scenarios', label: 'Labs', icon: '⬡' },
  { href: '/observe', label: 'Observatory', icon: '◎' },
  { href: '/skills', label: 'Skills', icon: '▤' },
  { href: '/report', label: 'Briefing', icon: '☰' },
  { href: '/classroom', label: 'Classroom', icon: '◫' },
];

const utilityNav = [
  { href: '/teardown', label: 'Reset lab', icon: '↺', danger: true },
];

function applySidebarWidth(collapsed: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(
    '--scas-sidebar-w',
    collapsed ? COLLAPSED_W : EXPANDED_W,
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(SIDEBAR_KEY) === '1';
    setCollapsed(stored);
    applySidebarWidth(stored);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applySidebarWidth(collapsed);
    window.localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0');
  }, [collapsed, ready]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const toggle = () => setCollapsed((c) => !c);

  const navLinkClass = (active: boolean, danger?: boolean) => {
    if (danger) {
      return active
        ? 'bg-state-error/12 text-state-error ring-1 ring-state-error/20'
        : 'text-ink-muted hover:bg-state-error/8 hover:text-state-error';
    }
    return active
      ? 'bg-brand text-white shadow-glow'
      : 'text-ink-muted hover:bg-canvas-hover hover:text-ink-primary';
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-line bg-canvas-elevated/95 backdrop-blur-md transition-[width] duration-200 ease-out ${
        collapsed ? 'w-[4.75rem]' : 'w-60'
      }`}
    >
      <div className={`border-b border-line py-4 ${collapsed ? 'px-2' : 'px-4'}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <Link
            href="/welcome"
            className="group relative flex shrink-0 items-center justify-center"
            title={collapsed ? 'SCAS — Learning platform' : undefined}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-base font-bold text-white shadow-glow">
              S
            </span>
            {collapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-canvas-elevated px-2.5 py-1.5 text-xs font-medium text-ink-primary opacity-0 shadow-lg transition group-hover:opacity-100">
                SCAS
              </span>
            )}
          </Link>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold text-ink-primary">SCAS</p>
              <p className="truncate text-[11px] text-ink-muted">Learning platform</p>
            </div>
          )}
        </div>
      </div>

      <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-visible py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
            Workspace
          </p>
        )}
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            className={`group relative flex items-center rounded-xl text-sm font-medium transition ${
              collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5'
            } ${navLinkClass(isActive(item.href))}`}
          >
            <span
              className={`flex shrink-0 items-center justify-center opacity-90 ${
                collapsed ? 'text-xl leading-none' : 'w-6 text-lg leading-none'
              }`}
              aria-hidden
            >
              {item.icon}
            </span>
            {!collapsed && <span>{item.label}</span>}
            {collapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-canvas-elevated px-2.5 py-1.5 text-xs font-medium text-ink-primary opacity-0 shadow-lg transition group-hover:opacity-100">
                {item.label}
              </span>
            )}
          </Link>
        ))}

        <div className={`my-4 border-t border-line ${collapsed ? 'mx-1' : ''}`} />

        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
            System
          </p>
        )}
        {utilityNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
            className={`group relative flex items-center rounded-xl text-sm font-medium transition ${
              collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-2.5'
            } ${navLinkClass(isActive(item.href), item.danger)}`}
          >
            <span
              className={`flex shrink-0 items-center justify-center opacity-90 ${
                collapsed ? 'text-xl leading-none' : 'w-6 text-lg leading-none'
              }`}
              aria-hidden
            >
              {item.icon}
            </span>
            {!collapsed && <span>{item.label}</span>}
            {collapsed && (
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-canvas-elevated px-2.5 py-1.5 text-xs font-medium text-ink-primary opacity-0 shadow-lg transition group-hover:opacity-100">
                {item.label}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className={`border-t border-line space-y-3 ${collapsed ? 'p-2' : 'p-4'}`}>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand menu' : 'Collapse menu'}
          className={`group relative flex w-full items-center rounded-xl border border-line bg-canvas-surface text-ink-muted transition hover:border-line-strong hover:bg-canvas-hover hover:text-ink-primary ${
            collapsed ? 'justify-center px-2 py-3' : 'justify-between gap-2 px-3 py-2.5'
          }`}
        >
          <span className={`leading-none ${collapsed ? 'text-xl' : 'text-lg'}`} aria-hidden>
            {collapsed ? '»' : '«'}
          </span>
          {!collapsed && <span className="text-xs font-medium">Collapse</span>}
          {collapsed && (
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-canvas-elevated px-2.5 py-1.5 text-xs font-medium text-ink-primary opacity-0 shadow-lg transition group-hover:opacity-100">
              Expand menu
            </span>
          )}
        </button>

        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between gap-2'}`}>
          {!collapsed && <span className="text-[11px] font-medium text-ink-muted">Theme</span>}
          <ThemeToggle />
        </div>

        {!collapsed && (
          <p className="px-1 text-[10px] leading-relaxed text-ink-faint">
            Localhost only · Education use · Control plane API on :3101
          </p>
        )}
      </div>
    </aside>
  );
}
