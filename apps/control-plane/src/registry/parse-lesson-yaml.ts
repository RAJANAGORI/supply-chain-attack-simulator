/**
 * Minimal YAML subset parser for lesson.yaml files.
 * Supports maps, lists, quoted/unquoted scalars, null, and inline { k: v } objects.
 */
import { CLASSROOM_ROLES } from './lesson-types.js';
import type {
  ClassroomRole,
  DecisionChoice,
  LessonAudience,
  LessonDefinition,
  LessonDrill,
  LessonDecision,
  LessonDiffWorkbench,
  LessonPrTriage,
  LessonTriagedPR,
  LessonQuizQuestion,
  LessonReversal,
  LessonStep,
  LessonVerify,
} from './lesson-types.js';

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
  // Empty string is a blank line, not end-of-input. Only undefined means past the last line.
  if (first === undefined) return { value: null, next: start };

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
  // Skip leading blank / comment lines so a file that starts with `\n` still parses.
  let start = 0;
  while (start < lines.length && (!lines[start].trim() || lines[start].trim().startsWith('#'))) {
    start += 1;
  }
  const { value } = parseBlock(lines, start, 0);
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

  const attck = optionalTagList(raw.attck, 'attck');
  const nist = optionalTagList(raw.nist, 'nist');
  const prereqs = optionalTagList(raw.prereqs, 'prereqs');
  const remediates = optionalTagList(raw.remediates, 'remediates');

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

  const drill = normalizeDrill(raw.drill);
  const quiz = normalizeQuiz(raw.quiz);
  const decisions = normalizeDecisions(raw.decisions);
  const reversal = normalizeReversal(raw.reversal);
  const prTriageStep = raw.prTriageStep === true || raw.prTriageStep === 'true';
  const prTriage = normalizePrTriage(raw.prTriage);
  const diffWorkbench = normalizeDiffWorkbench(raw.diffWorkbench);

  return {
    id,
    etaMinutes,
    category,
    incidents,
    objectives,
    caseStudy,
    mitigation,
    attck,
    nist,
    prereqs,
    remediates,
    steps,
    drill,
    quiz,
    decisions,
    reversal,
    prTriageStep,
    prTriage,
    diffWorkbench,
  };
}

function optionalString(raw: Record<string, unknown>, key: string, field: string): string | undefined {
  const v = raw[key];
  if (v === undefined || v === null) return undefined;
  const s = asString(v, `${field}.${key}`).trim();
  return s || undefined;
}

/** Normalize a lesson.yaml `diffWorkbench` block (Tarball-vs-Git fixtures). */
function normalizeDiffWorkbench(raw: unknown): LessonDiffWorkbench | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('diffWorkbench must be a mapping');
  }
  const d = raw as Record<string, unknown>;
  const fixtureDir = asString(d.fixtureDir, 'diffWorkbench.fixtureDir').trim();
  const segments = fixtureDir.split(/[\\/]/);
  if (
    !fixtureDir ||
    fixtureDir.startsWith('/') ||
    fixtureDir.startsWith('\\') ||
    /^[A-Za-z]:/.test(fixtureDir) ||
    segments.includes('..')
  ) {
    throw new Error('diffWorkbench.fixtureDir must be a relative path inside the scenario folder');
  }
  return {
    fixtureDir,
    title: optionalString(d, 'title', 'diffWorkbench'),
    prompt: optionalString(d, 'prompt', 'diffWorkbench'),
    gitLabel: optionalString(d, 'gitLabel', 'diffWorkbench'),
    tarballLabel: optionalString(d, 'tarballLabel', 'diffWorkbench'),
    afterStep: optionalString(d, 'afterStep', 'diffWorkbench'),
  };
}

/** Optional list of non-empty strings (ATT&CK ids, NIST refs, lab ids, control slugs). */
function optionalTagList(raw: unknown, field: string): string[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw)) throw new Error(`${field} must be a list of strings`);
  const out = raw.map((x, i) => asString(x, `${field}[${i}]`).trim());
  if (out.some((x) => !x)) throw new Error(`${field} entries must be non-empty`);
  return out.length ? out : undefined;
}

function normalizeReversal(raw: unknown): LessonReversal | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('reversal must be a mapping');
  }
  const r = raw as Record<string, unknown>;
  const blockedPackage = asString(r.blockedPackage, 'reversal.blockedPackage').trim();
  if (!blockedPackage) throw new Error('reversal.blockedPackage must be non-empty');
  if (r.variant === undefined || r.variant === null) return { blockedPackage };
  if (typeof r.variant !== 'object' || Array.isArray(r.variant)) {
    throw new Error('reversal.variant must be a mapping');
  }
  const v = r.variant as Record<string, unknown>;
  const entry = asString(v.entry, 'reversal.variant.entry').trim();
  if (!entry || entry.startsWith('/') || entry.includes('..')) {
    throw new Error('reversal.variant.entry must be a relative file inside the victim directory');
  }
  let port: number | undefined;
  if (v.port !== undefined && v.port !== null) {
    port = Number(v.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('reversal.variant.port must be a port number');
    }
  }
  return { blockedPackage, variant: { entry, ...(port !== undefined ? { port } : {}) } };
}

function normalizeQuiz(raw: unknown): LessonQuizQuestion[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('quiz must be a non-empty list of questions');
  }
  return raw.map((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`quiz[${i}] must be a mapping`);
    }
    const q = item as Record<string, unknown>;
    const question = asString(q.question, `quiz[${i}].question`).trim();
    if (!Array.isArray(q.choices) || q.choices.length < 2) {
      throw new Error(`quiz[${i}].choices must be a list of at least two options`);
    }
    const choices = q.choices.map((x, j) => asString(x, `quiz[${i}].choices[${j}]`));
    const answer = typeof q.answer === 'number' ? q.answer : Number(q.answer);
    if (!Number.isInteger(answer) || answer < 0 || answer >= choices.length) {
      throw new Error(`quiz[${i}].answer must be a valid index into choices`);
    }
    const explain = asString(q.explain, `quiz[${i}].explain`).trim();
    if (!question || !explain) {
      throw new Error(`quiz[${i}].question and quiz[${i}].explain must be non-empty`);
    }
    return { question, choices, answer, explain };
  });
}

const DRILL_ARTIFACT_TYPES = new Set(['diff', 'package-page', 'ci-log']);

function normalizeDrill(raw: unknown): LessonDrill | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('drill must be a mapping');
  }
  const d = raw as Record<string, unknown>;
  const prompt = asString(d.prompt, 'drill.prompt').trim();
  const artifactType = asString(d.artifactType, 'drill.artifactType').trim();
  if (!DRILL_ARTIFACT_TYPES.has(artifactType)) {
    throw new Error(`drill.artifactType must be one of ${Array.from(DRILL_ARTIFACT_TYPES).join(', ')}`);
  }
  // artifact is a list of lines (the minimal YAML subset has no block scalars)
  if (!Array.isArray(d.artifact) || d.artifact.length === 0) {
    throw new Error('drill.artifact must be a non-empty list of lines');
  }
  const artifact = d.artifact.map((x, i) => asString(x, `drill.artifact[${i}]`)).join('\n');
  if (!Array.isArray(d.choices) || d.choices.length < 2) {
    throw new Error('drill.choices must be a list of at least two options');
  }
  const choices = d.choices.map((x, i) => asString(x, `drill.choices[${i}]`));
  const answer = typeof d.answer === 'number' ? d.answer : Number(d.answer);
  if (!Number.isInteger(answer) || answer < 0 || answer >= choices.length) {
    throw new Error('drill.answer must be a valid index into drill.choices');
  }
  const reveal = asString(d.reveal, 'drill.reveal').trim();
  const explanation = asString(d.explanation, 'drill.explanation').trim();
  if (!prompt || !reveal || !explanation) {
    throw new Error('drill.prompt, drill.reveal, and drill.explanation must be non-empty');
  }
  return {
    prompt,
    artifactType: artifactType as LessonDrill['artifactType'],
    artifact,
    choices,
    answer,
    reveal,
    explanation,
  };
}

/** Normalize a lesson.yaml `decisions[]` block into LessonDecision[]. */
function normalizeDecisions(raw: unknown): LessonDecision[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('decisions must be a non-empty list of decision blocks');
  }
  return raw.map((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`decisions[${i}] must be a mapping`);
    }
    const d = item as Record<string, unknown>;

    const id = asString(d.id, `decisions[${i}].id`).trim();
    const afterStep = asString(d.afterStep, `decisions[${i}].afterStep`).trim();
    const prompt = asString(d.prompt, `decisions[${i}].prompt`).trim();
    if (!id || !afterStep || !prompt) {
      throw new Error(`decisions[${i}].id, .afterStep, and .prompt must be non-empty`);
    }

    // choices[]
    if (!Array.isArray(d.choices) || d.choices.length < 2) {
      throw new Error(`decisions[${i}].choices must be a list of at least two options`);
    }
    const choices: (DecisionChoice & { _rawEffects: Record<string, unknown> })[] = d.choices.map(
      (c, j) => {
        if (!c || typeof c !== 'object' || Array.isArray(c)) {
          throw new Error(`decisions[${i}].choices[${j}] must be a mapping`);
        }
        const ch = c as Record<string, unknown>;
        const choiceId = asString(ch.id, `decisions[${i}].choices[${j}].id`).trim();
        const label = asString(ch.label, `decisions[${i}].choices[${j}].label`).trim();
        if (!choiceId || !label) {
          throw new Error(`decisions[${i}].choices[${j}].id and .label must be non-empty`);
        }
        // effects (optional mapping)
        let effects: Record<string, unknown> = {};
        if (ch.effects !== undefined && ch.effects !== null) {
          if (typeof ch.effects !== 'object' || Array.isArray(ch.effects)) {
            throw new Error(`decisions[${i}].choices[${j}].effects must be a mapping`);
          }
          effects = ch.effects as Record<string, unknown>;
        }
        return { id: choiceId, label, _rawEffects: effects } as (DecisionChoice & {
          _rawEffects: Record<string, unknown>;
        });
      },
    );

    // Validate effects: score must be a number, flag must be string|array, goto must be string
    choices.forEach((ch, j) => {
      const e = ch._rawEffects;
      if (e.score !== undefined && e.score !== null) {
        const s = typeof e.score === 'number' ? e.score : Number(e.score);
        if (!Number.isFinite(s)) {
          throw new Error(`decisions[${i}].choices[${j}].effects.score must be a number`);
        }
      }
      if (e.flag !== undefined && e.flag !== null) {
        if (typeof e.flag !== 'string' && !Array.isArray(e.flag)) {
          throw new Error(`decisions[${i}].choices[${j}].effects.flag must be string or array`);
        }
      }
      if (e.goto !== undefined && e.goto !== null) {
        asString(e.goto, `decisions[${i}].choices[${j}].effects.goto`);
      }
      if (e.feedback !== undefined && e.feedback !== null) {
        asString(e.feedback, `decisions[${i}].choices[${j}].effects.feedback`);
      }
    });

    // roles[] (optional): tabletop roles that own this call
    let roles: ClassroomRole[] | undefined;
    if (d.roles !== undefined && d.roles !== null) {
      if (!Array.isArray(d.roles) || d.roles.length === 0) {
        throw new Error(`decisions[${i}].roles must be a non-empty list`);
      }
      roles = d.roles.map((r, k) => {
        const match = CLASSROOM_ROLES.find(
          (known) => known.toLowerCase() === String(r).trim().toLowerCase(),
        );
        if (!match) {
          throw new Error(
            `decisions[${i}].roles[${k}] must be one of ${CLASSROOM_ROLES.join('|')}, got ${String(r)}`,
          );
        }
        return match;
      });
    }

    return {
      id,
      afterStep,
      prompt,
      ...(roles ? { roles } : {}),
      choices: choices.map((ch) => ({
        id: ch.id,
        label: ch.label,
        effects: normalizeDecisionEffects(ch._rawEffects),
      })),
    } as LessonDecision;
  });
}

/** Convert raw effects mapping into typed DecisionEffect. */
function normalizeDecisionEffects(raw: Record<string, unknown>): import('./lesson-types.js').DecisionEffect {
  const score = raw.score;
  let scoreNum: number | undefined;
  if (score !== undefined && score !== null) {
    scoreNum = typeof score === 'number' ? score : Number(score);
    if (!Number.isFinite(scoreNum)) scoreNum = undefined;
  }

  const flag = raw.flag;
  let flagVal: string | string[] | undefined;
  if (flag !== undefined && flag !== null) {
    flagVal = typeof flag === 'string' ? flag : (Array.isArray(flag) ? flag : undefined);
  }

  return {
    goto: raw.goto ? asString(raw.goto, 'effects.goto') : undefined,
    score: scoreNum,
    flag: flagVal,
    feedback: raw.feedback ? asString(raw.feedback, 'effects.feedback') : undefined,
  };
}

/** Normalize a lesson.yaml `prTriage` block into LessonPrTriage. */
function normalizePrTriage(raw: unknown): LessonPrTriage | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('prTriage must be a mapping');
  }
  const p = raw as Record<string, unknown>;

  // afterStep is optional
  let afterStep: string | undefined;
  if (p.afterStep !== undefined && p.afterStep !== null) {
    afterStep = asString(p.afterStep, 'prTriage.afterStep').trim();
    if (!afterStep) afterStep = undefined;
  }

  // prs must be a non-empty array
  if (!Array.isArray(p.prs) || p.prs.length === 0) {
    throw new Error('prTriage.prs must be a non-empty list');
  }

  const prs: LessonTriagedPR[] = p.prs.map((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`prTriage.prs[${i}] must be a mapping`);
    }
    const pr = item as Record<string, unknown>;
    const id = asString(pr.id, `prTriage.prs[${i}].id`).trim();
    const title = asString(pr.title, `prTriage.prs[${i}].title`).trim();
    const dependency = asString(pr.dependency, `prTriage.prs[${i}].dependency`).trim();
    const diffSummary = asString(pr.diffSummary, `prTriage.prs[${i}].diffSummary`).trim();
    const safe = typeof pr.safe === 'boolean' ? pr.safe : pr.safe === 'true';
    if (typeof safe !== 'boolean') {
      throw new Error(`prTriage.prs[${i}].safe must be true or false`);
    }

    let blockLabel: string | undefined;
    if (pr.blockLabel !== undefined && pr.blockLabel !== null) {
      blockLabel = asString(pr.blockLabel, `prTriage.prs[${i}].blockLabel`).trim();
      if (!blockLabel) blockLabel = undefined;
    }

    let approveLabel: string | undefined;
    if (pr.approveLabel !== undefined && pr.approveLabel !== null) {
      approveLabel = asString(pr.approveLabel, `prTriage.prs[${i}].approveLabel`).trim();
      if (!approveLabel) approveLabel = undefined;
    }

    return { id, title, dependency, diffSummary, safe, blockLabel, approveLabel };
  });

  // Validate unique IDs
  const ids = new Set<string>();
  for (const pr of prs) {
    if (ids.has(pr.id)) {
      throw new Error(`prTriage.prs contains duplicate id: ${pr.id}`);
    }
    ids.add(pr.id);
  }

  return { afterStep, prs };
}
