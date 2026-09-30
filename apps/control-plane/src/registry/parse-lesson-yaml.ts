/**
 * Minimal YAML subset parser for lesson.yaml files.
 * Supports maps, lists, quoted/unquoted scalars, null, and inline { k: v } objects.
 */
import type { LessonAudience, LessonDefinition, LessonStep, LessonVerify } from './lesson-types.js';

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseScalar(raw: string): unknown {
  const t = raw.trim();
  if (t === '' || t === 'null' || t === '~') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?\d+$/.test(t)) return Number(t);
  if (/^-?\d+\.\d+$/.test(t)) return Number(t);
  if (t.startsWith('{') && t.endsWith('}')) {
    const inner = t.slice(1, -1).trim();
    if (!inner) return {};
    const obj: Record<string, unknown> = {};
    for (const part of inner.split(',')) {
      const eq = part.indexOf(':');
      if (eq < 0) continue;
      const k = part.slice(0, eq).trim();
      const v = parseScalar(part.slice(eq + 1));
      obj[k] = v;
    }
    return obj;
  }
  return stripQuotes(t);
}

type YamlNode = Record<string, unknown> | unknown[] | string | number | boolean | null;

function parseBlock(lines: string[], start: number, baseIndent: number): { value: YamlNode; next: number } {
  const first = lines[start];
  if (!first) return { value: null, next: start };

  const trimmed = first.trimStart();
  if (trimmed.startsWith('- ')) {
    const list: unknown[] = [];
    let i = start;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim() || line.trim().startsWith('#')) {
        i += 1;
        continue;
      }
      const indent = line.length - line.trimStart().length;
      if (indent < baseIndent) break;
      if (indent > baseIndent) {
        throw new Error(`Unexpected indent at line ${i + 1}: ${line}`);
      }
      if (!line.trimStart().startsWith('- ')) break;

      const afterDash = line.trimStart().slice(2);
      const keyMatch = afterDash.match(/^([A-Za-z_][\w]*)\s*:/);
      if (keyMatch && !afterDash.trimStart().startsWith('{')) {
        // list of maps: - id: setup
        const mapLines: string[] = [`${' '.repeat(indent + 2)}${afterDash}`];
        let j = i + 1;
        while (j < lines.length) {
          const next = lines[j];
          if (!next.trim() || next.trim().startsWith('#')) {
            j += 1;
            continue;
          }
          const ni = next.length - next.trimStart().length;
          if (ni <= indent) break;
          if (next.trimStart().startsWith('- ') && ni === indent) break;
          mapLines.push(next);
          j += 1;
        }
        const { value } = parseBlock(mapLines, 0, indent + 2);
        list.push(value);
        i = j;
      } else {
        list.push(parseScalar(afterDash));
        i += 1;
      }
    }
    return { value: list, next: i };
  }

  const map: Record<string, unknown> = {};
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) {
      i += 1;
      continue;
    }
    const indent = line.length - line.trimStart().length;
    if (indent < baseIndent) break;
    if (indent > baseIndent) {
      throw new Error(`Unexpected indent at line ${i + 1}: ${line}`);
    }
    if (line.trimStart().startsWith('- ')) break;

    const trimmedLine = line.trimStart();
    const colon = trimmedLine.indexOf(':');
    if (colon < 0) {
      throw new Error(`Expected key: value at line ${i + 1}: ${line}`);
    }
    const key = trimmedLine.slice(0, colon).trim();
    const rest = trimmedLine.slice(colon + 1).trim();

    if (rest !== '') {
      map[key] = parseScalar(rest);
      i += 1;
      continue;
    }

    // Nested block
    let j = i + 1;
    while (j < lines.length && (!lines[j].trim() || lines[j].trim().startsWith('#'))) j += 1;
    if (j >= lines.length) {
      map[key] = null;
      i = j;
      break;
    }
    const childIndent = lines[j].length - lines[j].trimStart().length;
    if (childIndent <= indent) {
      map[key] = null;
      i += 1;
      continue;
    }
    const nested = parseBlock(lines, j, childIndent);
    map[key] = nested.value;
    i = nested.next;
  }
  return { value: map, next: i };
}

export function parseLessonYaml(text: string): Record<string, unknown> {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const { value } = parseBlock(lines, 0, 0);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('lesson.yaml root must be a mapping');
  }
  return value as Record<string, unknown>;
}

function asString(v: unknown, field: string): string {
  if (typeof v !== 'string') throw new Error(`${field} must be a string`);
  return v;
}

function asAudience(v: unknown): LessonAudience {
  if (v === 'attack' || v === 'detect' || v === 'both') return v;
  throw new Error(`audience must be attack|detect|both, got ${String(v)}`);
}

function asVerify(v: unknown): LessonVerify {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    throw new Error('verify must be an object');
  }
  const obj = v as Record<string, unknown>;
  const type = obj.type;
  if (type === 'exit-zero') return { type: 'exit-zero' };
  if (type === 'service-listening') return { type: 'service-listening' };
  if (type === 'capture-count') {
    const min = typeof obj.min === 'number' ? obj.min : Number(obj.min);
    if (!Number.isFinite(min) || min < 1) throw new Error('capture-count.min must be >= 1');
    return { type: 'capture-count', min };
  }
  throw new Error(`unknown verify.type: ${String(type)}`);
}

export function normalizeLesson(raw: Record<string, unknown>, expectedId: string): LessonDefinition {
  const id = asString(raw.id, 'id');
  if (id !== expectedId) {
    throw new Error(`lesson id "${id}" does not match scenario id "${expectedId}"`);
  }
  const etaMinutes = typeof raw.etaMinutes === 'number' ? raw.etaMinutes : Number(raw.etaMinutes);
  if (!Number.isFinite(etaMinutes) || etaMinutes <= 0) {
    throw new Error('etaMinutes must be a positive number');
  }
  const category = asString(raw.category, 'category');
  const incidents = Array.isArray(raw.incidents)
    ? raw.incidents.map((x, i) => asString(x, `incidents[${i}]`))
    : [];
  const objectives = Array.isArray(raw.objectives)
    ? raw.objectives.map((x, i) => asString(x, `objectives[${i}]`))
    : [];

  let caseStudy: string | undefined;
  if (raw.caseStudy !== undefined && raw.caseStudy !== null) {
    caseStudy = asString(raw.caseStudy, 'caseStudy').trim();
    if (!caseStudy) caseStudy = undefined;
  }

  let mitigation: string[] | undefined;
  if (raw.mitigation !== undefined && raw.mitigation !== null) {
    if (!Array.isArray(raw.mitigation)) {
      throw new Error('mitigation must be a list of strings');
    }
    mitigation = raw.mitigation.map((x, i) => asString(x, `mitigation[${i}]`));
    if (mitigation.length === 0) mitigation = undefined;
  }

  if (!Array.isArray(raw.steps) || raw.steps.length === 0) {
    throw new Error('steps must be a non-empty list');
  }

  const steps: LessonStep[] = raw.steps.map((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`steps[${i}] must be a mapping`);
    }
    const s = item as Record<string, unknown>;
    const registryRaw = s.registry;
    let registry: string | null;
    if (registryRaw === null || registryRaw === undefined) registry = null;
    else registry = asString(registryRaw, `steps[${i}].registry`);

    return {
      id: asString(s.id, `steps[${i}].id`),
      registry,
      audience: asAudience(s.audience),
      title: asString(s.title, `steps[${i}].title`),
      teaching: asString(s.teaching, `steps[${i}].teaching`),
      hint: s.hint !== undefined && s.hint !== null ? asString(s.hint, `steps[${i}].hint`) : undefined,
      verify: asVerify(s.verify),
    };
  });

  return { id, etaMinutes, category, incidents, objectives, caseStudy, mitigation, steps };
}
