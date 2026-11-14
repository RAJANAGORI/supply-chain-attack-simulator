export type DiffRowKind = 'same' | 'removed' | 'added' | 'changed';

export interface DiffRow {
  kind: DiffRowKind;
  /** Left (git) line, or null when the line only exists on the right. */
  left: string | null;
  /** Right (tarball) line, or null when the line only exists on the left. */
  right: string | null;
  leftNo: number | null;
  rightNo: number | null;
}

/** Fixture files are small; cap the LCS table so a bad input cannot stall the tab. */
const MAX_CELLS = 250_000;

function splitLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/**
 * Aligned side-by-side rows via a longest-common-subsequence walk. A removed
 * line directly followed by an added line is paired into one "changed" row so
 * edits sit next to each other instead of in separate blocks.
 */
export function alignLines(leftText: string, rightText: string): DiffRow[] {
  const a = splitLines(leftText);
  const b = splitLines(rightText);
  const n = a.length;
  const m = b.length;

  if ((n + 1) * (m + 1) > MAX_CELLS) {
    // Fallback: positional compare.
    const rows: DiffRow[] = [];
    const len = Math.max(n, m);
    for (let i = 0; i < len; i++) {
      const l = i < n ? a[i] : null;
      const r = i < m ? b[i] : null;
      rows.push({
        kind: l === r ? 'same' : l === null ? 'added' : r === null ? 'removed' : 'changed',
        left: l,
        right: r,
        leftNo: l === null ? null : i + 1,
        rightNo: r === null ? null : i + 1,
      });
    }
    return rows;
  }

  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  let pendingRemoved: DiffRow[] = [];

  const flush = () => {
    rows.push(...pendingRemoved);
    pendingRemoved = [];
  };

  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      flush();
      rows.push({ kind: 'same', left: a[i], right: b[j], leftNo: i + 1, rightNo: j + 1 });
      i++;
      j++;
    } else if (i < n && (j >= m || lcs[i + 1][j] >= lcs[i][j + 1])) {
      // Removals first, so a following addition can pair with them as a "changed" row.
      pendingRemoved.push({ kind: 'removed', left: a[i], right: null, leftNo: i + 1, rightNo: null });
      i++;
    } else {
      const pair = pendingRemoved.shift();
      if (pair) {
        rows.push({ ...pair, kind: 'changed', right: b[j], rightNo: j + 1 });
      } else {
        rows.push({ kind: 'added', left: null, right: b[j], leftNo: null, rightNo: j + 1 });
      }
      j++;
    }
  }
  flush();
  return rows;
}

export function countChanges(rows: DiffRow[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const r of rows) {
    if (r.kind === 'added') added++;
    else if (r.kind === 'removed') removed++;
    else if (r.kind === 'changed') {
      added++;
      removed++;
    }
  }
  return { added, removed };
}
