import Link from 'next/link';
import type { SkillMatrix } from '@/lib/api';

/** Small chip row for ATT&CK ids and NIST refs from lesson.yaml. Renders nothing when empty. */
export function LabTags({ attck, nist }: { attck?: string[]; nist?: string[] }) {
  if (!attck?.length && !nist?.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Framework tags">
      {attck?.map((t) => (
        <li
          key={t}
          title="MITRE ATT&CK technique"
          className="rounded-md border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand"
        >
          {t}
        </li>
      ))}
      {nist?.map((n) => (
        <li
          key={n}
          title="NIST reference"
          className="rounded-md border border-line px-2 py-0.5 text-[11px] text-ink-muted"
        >
          {n}
        </li>
      ))}
    </ul>
  );
}

/** One-line adaptive tip. Renders nothing until a finished lab makes a suggestion possible. */
export function NextLabTip({ nextLab }: { nextLab: SkillMatrix['nextLab'] }) {
  if (!nextLab) return null;
  return (
    <p className="text-sm text-ink-secondary">
      Try next:{' '}
      <Link href={`/scenarios/${nextLab.id}`} className="font-medium text-brand hover:underline">
        Lab {nextLab.id}: {nextLab.title}
      </Link>
      <span className="text-ink-muted"> - {nextLab.reason}</span>
    </p>
  );
}
