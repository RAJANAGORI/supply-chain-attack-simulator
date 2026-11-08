import { load } from 'js-yaml';
import { safeRegexTest } from './safe-regex.js';

/**
 * Tiny, offline Sigma evaluator for the rule challenge. It matches a rule
 * against flat fixture events (plain objects). It never shells out, never reads
 * the network, and never evaluates learner code.
 *
 * Supported: selections as maps or lists of maps, keyword lists, field
 * modifiers contains / startswith / endswith / all / re, `*` and `?` wildcards,
 * null (field absent), and conditions built from and / or / not, parentheses,
 * `1 of x*`, `all of x*`, `1 of them`, `all of them`.
 * Not supported: aggregations (count, near), `|base64`, CIDR, and friends.
 */

export type SigmaEvent = Record<string, string | number | boolean | null>;

export interface SigmaRule {
  detection: Record<string, unknown> & { condition?: unknown };
  [key: string]: unknown;
}

export interface SigmaParseResult {
  rule?: SigmaRule;
  errors: string[];
  warnings: string[];
}

const MAX_RULE_CHARS = 8000;
const MAX_WILDCARDS = 8;

export function parseSigma(text: string): SigmaParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!text.trim()) return { errors: ['Rule is empty'], warnings };
  if (text.length > MAX_RULE_CHARS) return { errors: [`Rule is longer than ${MAX_RULE_CHARS} characters`], warnings };

  let doc: unknown;
  try {
    doc = load(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
    return { errors: [`YAML error: ${msg}`], warnings };
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    return { errors: ['Sigma rule must be a YAML mapping with a detection block'], warnings };
  }
  const rule = doc as SigmaRule;
  const detection = rule.detection;
  if (!detection || typeof detection !== 'object' || Array.isArray(detection)) {
    return { errors: ['Missing detection block'], warnings };
  }
  const condition = detection.condition;
  if (typeof condition !== 'string' || !condition.trim()) {
    errors.push('detection.condition must be a string such as "selection"');
  }
  const names = Object.keys(detection).filter((k) => k !== 'condition');
  if (names.length === 0) errors.push('detection needs at least one named selection');
  if (typeof rule.title !== 'string') warnings.push('No title set');
  if (typeof rule.level !== 'string') warnings.push('No level set (low, medium, high, critical)');
  if (errors.length > 0) return { errors, warnings };

  // Dry-run the condition once so syntax errors surface as errors, not as a score of 0.
  try {
    evaluateCondition(String(condition), names, () => false);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Bad condition');
  }
  return errors.length > 0 ? { errors, warnings } : { rule, errors, warnings };
}

/* ---- value matching ---- */

function globMatch(pattern: string, text: string): boolean {
  // Iterative glob (* and ?) - linear-ish, no regex, so no backtracking blowups.
  let p = 0;
  let t = 0;
  let star = -1;
  let mark = 0;
  while (t < text.length) {
    if (p < pattern.length && (pattern[p] === '?' || pattern[p] === text[t])) {
      p++;
      t++;
    } else if (p < pattern.length && pattern[p] === '*') {
      star = p++;
      mark = t;
    } else if (star !== -1) {
      p = star + 1;
      t = ++mark;
    } else {
      return false;
    }
  }
  while (p < pattern.length && pattern[p] === '*') p++;
  return p === pattern.length;
}

function toText(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

function matchOne(modifiers: string[], expected: unknown, actual: unknown): boolean {
  if (expected === null) return actual === undefined || actual === null;
  if (actual === undefined || actual === null) return false;
  const a = toText(actual).toLowerCase();
  const e = toText(expected).toLowerCase();
  if (modifiers.includes('re')) return safeRegexTest(toText(expected), toText(actual), 'i');
  if (modifiers.includes('contains')) return a.includes(e);
  if (modifiers.includes('startswith')) return a.startsWith(e);
  if (modifiers.includes('endswith')) return a.endsWith(e);
  if ((e.match(/[*?]/g) ?? []).length > MAX_WILDCARDS) return false;
  return globMatch(e, a);
}

function fieldMatches(event: SigmaEvent, key: string, expected: unknown): boolean {
  const [field, ...modifiers] = key.split('|').map((s) => s.trim());
  const lowerMods = modifiers.map((m) => m.toLowerCase());
  const known = new Set(['contains', 'startswith', 'endswith', 'all', 're']);
  for (const m of lowerMods) {
    if (!known.has(m)) throw new Error(`Unsupported modifier "|${m}" (lab evaluator supports contains, startswith, endswith, all, re)`);
  }
  const actual = field in event ? event[field] : undefined;
  if (Array.isArray(expected)) {
    const hits = expected.map((v) => matchOne(lowerMods, v, actual));
    return lowerMods.includes('all') ? hits.every(Boolean) : hits.some(Boolean);
  }
  return matchOne(lowerMods, expected, actual);
}

function selectionMatches(selection: unknown, event: SigmaEvent): boolean {
  if (Array.isArray(selection)) {
    if (selection.every((s) => typeof s === 'string' || typeof s === 'number')) {
      // keyword list: any keyword appearing in any field value
      const blob = Object.values(event).map(toText).join(' \n ').toLowerCase();
      return selection.some((k) => blob.includes(toText(k).toLowerCase()));
    }
    return selection.some((s) => selectionMatches(s, event));
  }
  if (selection && typeof selection === 'object') {
    const entries = Object.entries(selection as Record<string, unknown>);
    if (entries.length === 0) return false;
    return entries.every(([key, expected]) => fieldMatches(event, key, expected));
  }
  return false;
}

/* ---- condition parsing ---- */

type Tok = { t: 'lp' | 'rp' | 'and' | 'or' | 'not' | 'quant' | 'name'; v: string };

function tokenize(cond: string): Tok[] {
  const toks: Tok[] = [];
  const re = /\(|\)|[^\s()]+/g;
  const raw = cond.match(re) ?? [];
  for (let i = 0; i < raw.length; i++) {
    const w = raw[i];
    const lw = w.toLowerCase();
    if (w === '(') toks.push({ t: 'lp', v: w });
    else if (w === ')') toks.push({ t: 'rp', v: w });
    else if (lw === 'and' || lw === 'or' || lw === 'not') toks.push({ t: lw, v: lw });
    else if ((lw === 'all' || /^\d+$/.test(lw)) && raw[i + 1]?.toLowerCase() === 'of' && raw[i + 2]) {
      toks.push({ t: 'quant', v: `${lw}|${raw[i + 2]}` });
      i += 2;
    } else if (w.includes('|')) {
      throw new Error('Aggregations in condition (count, near, ...) are not supported by the lab evaluator');
    } else toks.push({ t: 'name', v: w });
  }
  return toks;
}

function evaluateCondition(cond: string, names: string[], eval1: (name: string) => boolean): boolean {
  const toks = tokenize(cond);
  let pos = 0;
  const peek = () => toks[pos];

  const known = new Set(names);
  const useName = (n: string) => {
    if (!known.has(n)) throw new Error(`Condition references unknown selection "${n}"`);
    return eval1(n);
  };

  const parseOr = (): boolean => {
    let left = parseAnd();
    while (peek()?.t === 'or') {
      pos++;
      const right = parseAnd();
      left = left || right;
    }
    return left;
  };
  const parseAnd = (): boolean => {
    let left = parseNot();
    while (peek()?.t === 'and') {
      pos++;
      const right = parseNot();
      left = left && right;
    }
    return left;
  };
  const parseNot = (): boolean => {
    if (peek()?.t === 'not') {
      pos++;
      return !parseNot();
    }
    return parsePrimary();
  };
  const parsePrimary = (): boolean => {
    const tok = toks[pos++];
    if (!tok) throw new Error('Condition ended unexpectedly');
    if (tok.t === 'lp') {
      const v = parseOr();
      if (toks[pos++]?.t !== 'rp') throw new Error('Missing closing parenthesis in condition');
      return v;
    }
    if (tok.t === 'name') return useName(tok.v);
    if (tok.t === 'quant') {
      const [q, target] = tok.v.split('|');
      const pool =
        target === 'them'
          ? names
          : names.filter((n) => (target.endsWith('*') ? n.startsWith(target.slice(0, -1)) : n === target));
      if (pool.length === 0) throw new Error(`"${q} of ${target}" matches no selection`);
      const hits = pool.map((n) => useName(n));
      if (q === 'all') return hits.every(Boolean);
      return hits.filter(Boolean).length >= Number(q);
    }
    throw new Error(`Unexpected "${tok.v}" in condition`);
  };

  const result = parseOr();
  if (pos < toks.length) throw new Error(`Unexpected "${toks[pos].v}" in condition`);
  return result;
}

export function sigmaMatches(rule: SigmaRule, event: SigmaEvent): boolean {
  const detection = rule.detection;
  const names = Object.keys(detection).filter((k) => k !== 'condition');
  return evaluateCondition(String(detection.condition), names, (name) => selectionMatches(detection[name], event));
}
