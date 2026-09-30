'use client';

import { useState } from 'react';
import { Alert, Btn, Card } from '@/components/ui';
import { cp } from '@/lib/api';

export function LabAssistant({
  scenarioId,
  stepId,
}: {
  scenarioId?: string;
  stepId?: string;
}) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [provider, setProvider] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ask = async (preset?: string) => {
    const q = (preset ?? question).trim();
    if (!q) return;
    setBusy(true);
    setError('');
    try {
      const res = await cp.askAssistant({ question: q, scenarioId, stepId });
      setAnswer(res.answer);
      setProvider(`${res.provider}${res.offline ? ' (offline)' : ''}`);
      if (!preset) setQuestion('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assistant failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title="Lab coach"
      subtitle="Context-aware help for the current step. Offline by default; set SCAS_AI_URL + SCAS_AI_API_KEY for a live model."
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Btn
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void ask('Explain this step in simpler terms.')}
        >
          Explain simpler
        </Btn>
        <Btn
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void ask('What real incident is this based on?')}
        >
          Real incident?
        </Btn>
        <Btn
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => void ask('Help me understand what the captured data means.')}
        >
          Explain captures
        </Btn>
      </div>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={3}
        placeholder="Ask about this lab step…"
        className="focus-ring w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink-primary placeholder:text-ink-faint"
      />
      <div className="mt-3 flex gap-2">
        <Btn disabled={busy || !question.trim()} onClick={() => void ask()}>
          {busy ? 'Thinking…' : 'Ask'}
        </Btn>
      </div>
      {error && (
        <div className="mt-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {answer && (
        <div className="mt-4 rounded-xl border border-line bg-canvas-hover/50 px-4 py-3 text-sm leading-relaxed text-ink-secondary whitespace-pre-wrap">
          {provider && <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-faint">{provider}</p>}
          {answer}
        </div>
      )}
    </Card>
  );
}
