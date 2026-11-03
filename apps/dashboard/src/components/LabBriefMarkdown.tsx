'use client';

import { Fragment, type ReactNode } from 'react';

type Block =
  | { type: 'h'; level: 1 | 2 | 3; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'hr' }
  | { type: 'code'; lang: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'quote'; text: string };

function rewriteHref(href: string, slug: string): string {
  if (/^https?:\/\//i.test(href) || href.startsWith('/') || href.startsWith('#')) return href;
  return `/archify/scenarios/${slug}/${href.replace(/^\.\//, '')}`;
}

/** Inline markdown: `code`, **bold**, *em*, [label](href) */
function renderInline(text: string, slug: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(<Fragment key={`${keyPrefix}-t${i++}`}>{text.slice(last, m.index)}</Fragment>);
    }
    const token = m[0];
    if (token.startsWith('`')) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${i++}`}
          className="rounded-md border border-line bg-canvas-hover px-1.5 py-0.5 font-mono text-[12px] text-ink-primary"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i++}`} className="font-semibold text-ink-primary">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('*')) {
      nodes.push(
        <em key={`${keyPrefix}-e${i++}`} className="italic text-ink-secondary">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith('[')) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const href = rewriteHref(link[2], slug);
        const external = /^https?:\/\//i.test(href);
        nodes.push(
          <a
            key={`${keyPrefix}-a${i++}`}
            href={href}
            className="font-medium text-brand underline-offset-2 hover:underline"
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
          >
            {link[1]}
          </a>,
        );
      } else {
        nodes.push(<Fragment key={`${keyPrefix}-f${i++}`}>{token}</Fragment>);
      }
    }
    last = m.index + token.length;
  }
  if (last < text.length) {
    nodes.push(<Fragment key={`${keyPrefix}-t${i++}`}>{text.slice(last)}</Fragment>);
  }
  return nodes;
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map((c) => c.trim());
}

function isTableSep(line: string): boolean {
  return /^\|?[\s:-]+\|[\s|:-]*\|?$/.test(line.trim()) && line.includes('-');
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i += 1;
      continue;
    }

    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1] || '';
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        body.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: 'code', lang, code: body.join('\n') });
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: 'h',
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }

    if (line.trim().startsWith('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headers = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    if (line.trim().startsWith('>')) {
      const parts: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        parts.push(lines[i].replace(/^\s*>\s?/, ''));
        i += 1;
      }
      blocks.push({ type: 'quote', text: parts.join(' ') });
      continue;
    }

    const parts: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].trim().startsWith('|') &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^---+$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('>')
    ) {
      parts.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'p', text: parts.join(' ') });
  }

  return blocks;
}

/**
 * Zero-dependency markdown renderer for lab briefs (GFM tables, fences, lists, links).
 * Avoids react-markdown so ./run.sh does not require an extra install step.
 */
export function LabBriefMarkdown({ markdown, slug }: { markdown: string; slug: string }) {
  const blocks = parseBlocks(markdown);

  return (
    <div className="scas-md max-w-none">
      {blocks.map((block, idx) => {
        const key = `b${idx}`;
        switch (block.type) {
          case 'h': {
            const cls =
              block.level === 1
                ? 'mb-4 text-2xl font-semibold tracking-tight text-ink-primary sm:text-3xl'
                : block.level === 2
                  ? 'mb-3 mt-8 border-b border-line pb-2 text-lg font-semibold text-ink-primary'
                  : 'mb-2 mt-6 text-base font-semibold text-ink-primary';
            const Tag = (`h${block.level}` as 'h1' | 'h2' | 'h3');
            return (
              <Tag key={key} className={cls}>
                {renderInline(block.text, slug, key)}
              </Tag>
            );
          }
          case 'p':
            return (
              <p key={key} className="mb-4 text-sm leading-relaxed text-ink-secondary">
                {renderInline(block.text, slug, key)}
              </p>
            );
          case 'ul':
            return (
              <ul key={key} className="mb-4 list-disc space-y-1.5 pl-5 text-sm text-ink-secondary">
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`} className="leading-relaxed">
                    {renderInline(item, slug, `${key}-${j}`)}
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={key} className="mb-4 list-decimal space-y-1.5 pl-5 text-sm text-ink-secondary">
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`} className="leading-relaxed">
                    {renderInline(item, slug, `${key}-${j}`)}
                  </li>
                ))}
              </ol>
            );
          case 'hr':
            return <hr key={key} className="my-8 border-line" />;
          case 'quote':
            return (
              <blockquote
                key={key}
                className="mb-4 border-l-2 border-brand/40 bg-brand/5 px-4 py-2 text-sm text-ink-secondary"
              >
                {renderInline(block.text, slug, key)}
              </blockquote>
            );
          case 'code':
            return (
              <pre
                key={key}
                className="mb-4 overflow-x-auto rounded-xl border border-line bg-[#0c0b14] p-4 font-mono text-[12px] leading-relaxed text-white/75"
              >
                <code>{block.code}</code>
              </pre>
            );
          case 'table':
            return (
              <div key={key} className="mb-4 overflow-x-auto rounded-xl border border-line">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-canvas-hover/80 text-ink-primary">
                    <tr>
                      {block.headers.map((h, j) => (
                        <th
                          key={`${key}-h${j}`}
                          className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-muted"
                        >
                          {renderInline(h, slug, `${key}-h${j}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {block.rows.map((row, r) => (
                      <tr key={`${key}-r${r}`} className="align-top">
                        {row.map((cell, c) => (
                          <td key={`${key}-r${r}c${c}`} className="px-3 py-2.5 text-ink-secondary">
                            {renderInline(cell, slug, `${key}-r${r}c${c}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
