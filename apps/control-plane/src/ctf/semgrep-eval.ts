import { load } from 'js-yaml';
import { safeRegexTest } from './safe-regex.js';

/**
 * Offline approximation of Semgrep for the rule challenge. We do NOT run the
 * semgrep binary (no remote rule packs, no network). Each fixture is a short
 * code snippet and the rule is checked as text:
 *
 * - pattern / pattern-inside: converted to a whitespace-tolerant regex.
 *   `$VAR` matches one token, `...` matches anything, quote styles are equal.
 * - pattern-regex: run as a regex (timeout-guarded).
 * - patterns (all must hold), pattern-either (any), pattern-not / pattern-not-regex.
 *
 * This is a teaching scorer, not a Semgrep reimplementation: no AST, no taint,
 * no metavariable unification.
 */

export interface SemgrepRule {
  id?: string;
  message?: string;
  severity?: string;
  languages?: unknown;
  [key: string]: unknown;
}

export interface SemgrepParseResult {
  rule?: SemgrepRule;
  errors: string[];
  warnings: string[];
}

const MAX_RULE_CHARS = 8000;
const OPS = ['pattern', 'pattern-regex', 'patterns', 'pattern-either'];

export function parseSemgrep(text: string): SemgrepParseResult {
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
  const root = doc as { rules?: unknown } | null;
  const rules = Array.isArray(root?.rules) ? (root!.rules as unknown[]) : null;
  if (!rules || rules.length === 0) return { errors: ['Semgrep YAML needs a top-level "rules:" list'], warnings };
  if (rules.length > 1) warnings.push('Only the first rule in the list is scored');
  const rule = rules[0] as SemgrepRule;
  if (!rule || typeof rule !== 'object') return { errors: ['rules[0] must be a mapping'], warnings };
  if (!OPS.some((op) => op in rule)) {
    errors.push('Rule needs one of: pattern, pattern-regex, patterns, pattern-either');
    return { errors, warnings };
  }
  if (typeof rule.id !== 'string') warnings.push('No rule id');
  if (typeof rule.message !== 'string') warnings.push('No message');
  if (!Array.isArray(rule.languages)) warnings.push('No languages list (for example [javascript])');
  if (typeof rule.severity !== 'string') warnings.push('No severity (INFO, WARNING, ERROR)');
  return { rule, errors, warnings };
}

/** Convert a Semgrep-ish pattern into a regex source. */
function patternToRegex(pattern: string): string {
  const parts = pattern.trim().split(/(\.\.\.|\$[A-Z_][A-Z0-9_]*|\s+|["'`])/);
  let out = '';
  for (const part of parts) {
    if (!part) continue;
    if (part === '...') out += '[\\s\\S]*?';
    else if (/^\$[A-Z_][A-Z0-9_]*$/.test(part)) out += '[^\\s,(){}]+';
    else if (/^\s+$/.test(part)) out += '\\s*';
    else if (/^["'`]$/.test(part)) out += '["\'`]';
    else out += part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return out;
}

function evalNode(node: unknown, code: string): boolean {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    throw new Error('Pattern entries must be mappings such as { pattern: "..." }');
  }
  const obj = node as Record<string, unknown>;
  const keys = Object.keys(obj);
  if (keys.length === 0) throw new Error('Empty pattern entry');

  const results = keys.map((key) => {
    const value = obj[key];
    switch (key) {
      case 'pattern':
      case 'pattern-inside':
        if (typeof value !== 'string') throw new Error(`${key} must be a string`);
        return safeRegexTest(patternToRegex(value), code, '');
      case 'pattern-regex':
        if (typeof value !== 'string') throw new Error('pattern-regex must be a string');
        return safeRegexTest(value, code, 'm');
      case 'pattern-not':
        if (typeof value !== 'string') throw new Error('pattern-not must be a string');
        return !safeRegexTest(patternToRegex(value), code, '');
      case 'pattern-not-regex':
        if (typeof value !== 'string') throw new Error('pattern-not-regex must be a string');
        return !safeRegexTest(value, code, 'm');
      case 'patterns':
        if (!Array.isArray(value)) throw new Error('patterns must be a list');
        return value.map((n) => evalNode(n, code)).every(Boolean);
      case 'pattern-either':
        if (!Array.isArray(value)) throw new Error('pattern-either must be a list');
        return value.map((n) => evalNode(n, code)).some(Boolean);
      case 'id':
      case 'message':
      case 'severity':
      case 'languages':
      case 'metadata':
      case 'fix':
      case 'paths':
      case 'options':
        return true; // rule-level metadata sits beside the operators
      default:
        throw new Error(`Unsupported operator "${key}" (lab scorer supports pattern, pattern-regex, patterns, pattern-either, pattern-not, pattern-not-regex, pattern-inside)`);
    }
  });
  return results.every(Boolean);
}

export function semgrepMatches(rule: SemgrepRule, code: string): boolean {
  return evalNode(rule, code);
}
