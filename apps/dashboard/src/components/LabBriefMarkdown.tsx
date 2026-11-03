'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

function rewriteHref(href: string | undefined, slug: string): string | undefined {
  if (!href) return href;
  if (/^https?:\/\//i.test(href) || href.startsWith('/') || href.startsWith('#')) return href;
  // Relative diagram links inside the brief -> static /archify pack
  const cleaned = href.replace(/^\.\//, '');
  return `/archify/scenarios/${slug}/${cleaned}`;
}

/**
 * Renders a lab brief markdown file with Control Center surface styles.
 */
export function LabBriefMarkdown({ markdown, slug }: { markdown: string; slug: string }) {
  const components: Components = {
    h1: ({ children }) => (
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-ink-primary sm:text-3xl">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-3 mt-8 border-b border-line pb-2 text-lg font-semibold text-ink-primary">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-6 text-base font-semibold text-ink-primary">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="mb-4 text-sm leading-relaxed text-ink-secondary">{children}</p>
    ),
    a: ({ href, children }) => (
      <a
        href={rewriteHref(href, slug)}
        className="font-medium text-brand underline-offset-2 hover:underline"
        target={href && /^https?:\/\//i.test(href) ? '_blank' : undefined}
        rel={href && /^https?:\/\//i.test(href) ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="mb-4 list-disc space-y-1.5 pl-5 text-sm text-ink-secondary">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-4 list-decimal space-y-1.5 pl-5 text-sm text-ink-secondary">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-ink-primary">{children}</strong>,
    em: ({ children }) => <em className="italic text-ink-secondary">{children}</em>,
    hr: () => <hr className="my-8 border-line" />,
    blockquote: ({ children }) => (
      <blockquote className="mb-4 border-l-2 border-brand/40 bg-brand/5 px-4 py-2 text-sm text-ink-secondary">
        {children}
      </blockquote>
    ),
    code: ({ className, children }) => {
      const isBlock = typeof className === 'string' && className.includes('language-');
      if (isBlock) {
        return <code className={className}>{children}</code>;
      }
      return (
        <code className="rounded-md border border-line bg-canvas-hover px-1.5 py-0.5 font-mono text-[12px] text-ink-primary">
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="mb-4 overflow-x-auto rounded-xl border border-line bg-[#0c0b14] p-4 font-mono text-[12px] leading-relaxed text-white/75">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="mb-4 overflow-x-auto rounded-xl border border-line">
        <table className="min-w-full border-collapse text-left text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-canvas-hover/80 text-ink-primary">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-line">{children}</tbody>,
    tr: ({ children }) => <tr className="align-top">{children}</tr>,
    th: ({ children }) => (
      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{children}</th>
    ),
    td: ({ children }) => <td className="px-3 py-2.5 text-ink-secondary">{children}</td>,
  };

  return (
    <div className="scas-md max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
