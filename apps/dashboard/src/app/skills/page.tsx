'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, Btn, Card, PageHeader, StatTile } from '@/components/ui';
import { cp, type SkillMatrix } from '@/lib/api';

export default function SkillsPage() {
  const [matrix, setMatrix] = useState<SkillMatrix | null>(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      setMatrix(await cp.getSkills());
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load skills');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const download = async (format: 'json' | 'md') => {
    setExporting(true);
    try {
      if (format === 'md') {
        const text = await cp.exportSkillsMarkdown();
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scas-skill-matrix.md';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await cp.getSkills();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scas-skill-matrix.json';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Skills"
        title="Skill matrix"
        description="Categories come from lesson.yaml. A lab counts as done when every guided step is verified."
        action={
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" disabled={exporting} onClick={() => void download('md')}>
              Export Markdown
            </Btn>
            <Btn variant="secondary" disabled={exporting} onClick={() => void download('json')}>
              Export JSON
            </Btn>
          </div>
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      {matrix && (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <StatTile
              label="Guided labs complete"
              value={`${matrix.completedLabs}/${matrix.totalLabs}`}
              sub="All storyboard steps verified"
              accent="ok"
            />
            <StatTile
              label="Categories practiced"
              value={matrix.categories.filter((c) => c.completed > 0).length}
              sub={`of ${matrix.categories.length} attack categories`}
              accent="brand"
            />
          </div>

          <div className="mt-8 space-y-3">
            {matrix.categories.map((c) => {
              const pct = c.total ? Math.round((c.completed / c.total) * 100) : 0;
              return (
                <Card key={c.category} title={c.label} subtitle={`${c.completed}/${c.total} labs · ${pct}%`}>
                  <div className="h-2 overflow-hidden rounded-full bg-canvas-hover">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-3 text-xs text-ink-muted">
                    Done: {c.completedIds.length ? c.completedIds.join(', ') : 'none yet'}
                  </p>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
