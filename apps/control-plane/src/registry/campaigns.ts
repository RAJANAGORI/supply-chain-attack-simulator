/** Campaign metadata shared across scenario groups. */

import fs from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readProgress } from '../learning/progress.js';
import { isLessonComplete } from '../learning/lesson-progress.js';
import { loadLesson } from './lesson-loader.js';
import { SCENARIOS } from './scenarios.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Severity labels used across injects and remediation. */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** A single piece of evidence attached to an inject. */
export interface CampaignEvidence {
  type: 'dns-log' | 'network-flow' | 'pr-diff' | 'hash-diff';
  /** Free-form fields depending on evidence type. */
  [key: string]: unknown;
}

/** A timed intelligence event injected into the campaign timeline. */
export interface CampaignInject {
  /** Unique within the campaign. */
  id: string;
  /** Trigger: which chapter beat fires this, or a scenario-id like 'scenario:05'. */
  when: string;
  kind: 'intel-brief' | 'alert';
  /** ISO timestamp when the intel was "received". */
  timestamp: string;
  /** Source label shown to the learner. */
  from: string;
  /** Short headline. */
  subject: string;
  /** Full narrative text. */
  body: string;
  /** Optional evidence artifacts. */
  evidence?: CampaignEvidence[];
  /** Confidence score 0–1. */
  confidence: number;
  /** Optional tabletop clock position (minutes after T+0) when the instructor releases this inject. */
  tMinute?: number;
}

/** One chapter in the campaign chain. */
export interface CampaignChapter {
  scenario: string;
  beat: string;
  narrative: string;
}

/** Chapter plus live progress for the campaign map UI. */
export interface CampaignChapterStatus extends CampaignChapter {
  scenarioId: string;
  title: string;
  slug: string;
  completed: boolean;
  /** True when this is the next unfinished chapter. */
  current: boolean;
}

/** Full campaign payload the dashboard /campaign page expects. */
export interface CampaignStatus {
  id: string;
  title: string;
  persona: string;
  tagline: string;
  description: string;
  debrief: string;
  chapters: CampaignChapterStatus[];
  completedChapters: number;
  totalChapters: number;
  done: boolean;
}

/** A graded remediation action after campaign completion. */
export interface CampaignRemediation {
  id: string;
  title: string;
  severity: Severity;
  /** Weight toward the final remediation grade (0–25). */
  weight: number;
  description: string;
  /** Steps the learner must complete. */
  steps: string[];
  /** Flag set on progress when marked done. */
  flag: string;
}

/** A remediation execution node: the chain from install → exfil → pivot → exfil. */
export interface ExecutionNode {
  /** Human-readable stage name. */
  stage: string;
  /** What the learner did or observed at this stage. */
  description: string;
  severity: Severity;
  /** Which lab / capture source produced the data for this node. */
  source: string;
  /** Whether the learner's capture data confirms this stage. */
  confirmed: boolean;
  /** Indicator extracted from captures (e.g. key name), never the secret. */
  indicator?: string;
}

/** Full campaign definition from YAML. */
export interface CampaignDefinition {
  id: string;
  title: string;
  persona: string;
  tagline: string;
  description: string;
  chapters: CampaignChapter[];
  debrief: string;
  /** Injects are pre-written intelligence events that arrive at campaign beats. */
  injects?: CampaignInject[];
  /** Graded remediation checklist shown after the full chain. */
  remediation?: CampaignRemediation[];
}

/** Path to the campaign YAML files directory. */
const CAMPAIGNS_DIR = path.join(__dirname, '../../../../campaigns');

/**
 * Load all campaign definitions. Cache on first call.
 */
let _cache: CampaignDefinition[] | null = null;

function _load(): CampaignDefinition[] {
  if (_cache) return _cache;

  try {
    const files = fs.readdirSync(CAMPAIGNS_DIR).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
    _cache = files.map((file) => {
      const fullPath = path.join(CAMPAIGNS_DIR, file);
      const raw = fs.readFileSync(fullPath, 'utf-8');
      return load(raw) as CampaignDefinition;
    });
  } catch {
    _cache = [];
  }

  return _cache;
}

/** Lab counts as done when every lesson step is marked complete in progress. */
function scenarioCompleted(scenarioId: string): boolean {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) return false;
  let lesson;
  try {
    lesson = loadLesson(scenario);
  } catch {
    // A broken lesson.yaml must not take down GET /campaigns.
    return false;
  }
  if (!lesson || lesson.steps.length === 0) return false;
  const entry = readProgress().scenarios[scenarioId];
  return isLessonComplete(lesson, entry?.completedSteps);
}

/**
 * Get a single campaign by slug (raw YAML definition).
 */
export function getCampaign(slug: string): CampaignDefinition | undefined {
  return _load().find((c) => c.id === slug);
}

/**
 * Enrich one campaign with per-chapter progress for the map UI.
 */
export function getCampaignStatus(slug: string): CampaignStatus | null {
  const campaign = getCampaign(slug);
  if (!campaign) return null;

  let sawCurrent = false;
  const chapterDefs = Array.isArray(campaign.chapters) ? campaign.chapters : [];
  const chapters: CampaignChapterStatus[] = chapterDefs.map((ch) => {
    const scenario = SCENARIOS.find((s) => s.id === ch.scenario);
    const completed = scenarioCompleted(ch.scenario);
    const current = !completed && !sawCurrent;
    if (current) sawCurrent = true;
    return {
      ...ch,
      scenarioId: scenario?.id ?? ch.scenario,
      title: scenario?.title ?? `Lab ${ch.scenario}`,
      slug: scenario?.slug ?? ch.scenario,
      completed,
      current,
    };
  });

  const completedChapters = chapters.filter((c) => c.completed).length;
  return {
    id: campaign.id,
    title: campaign.title,
    persona: campaign.persona,
    tagline: campaign.tagline,
    description: campaign.description,
    debrief: campaign.debrief,
    chapters,
    completedChapters,
    totalChapters: chapters.length,
    done: completedChapters === chapters.length && chapters.length > 0,
  };
}

/**
 * All campaigns with live chapter progress (what GET /campaigns returns).
 */
export function listCampaignStatus(): CampaignStatus[] {
  return _load()
    .map((c) => getCampaignStatus(c.id))
    .filter((s): s is CampaignStatus => s !== null);
}

/**
 * Compact summary list for selectors that only need id + chapter count.
 */
export function listCampaigns(): Array<{ id: string; title: string; persona: string; tagline: string; chapterCount: number }> {
  return _load().map((c) => ({
    id: c.id,
    title: c.title,
    persona: c.persona,
    tagline: c.tagline,
    chapterCount: c.chapters?.length ?? 0,
  }));
}

/**
 * Resolve which injects are active given the learner's progress.
 * An inject fires when its `when` condition matches any completed chapter.
 */
export function resolveInjects(
  campaign: CampaignDefinition,
  completedScenarios: string[],
): CampaignInject[] {
  if (!campaign.injects) return [];

  return campaign.injects.filter((inj) => {
    // Authors write chapter:05 to mean lab/scenario "05". Prefer that match.
    // Fall back to a 1-based chapter index when no chapter has that scenario id.
    if (inj.when.startsWith('chapter:')) {
      const token = inj.when.slice('chapter:'.length).trim();
      if (campaign.chapters.some((ch) => ch.scenario === token)) {
        return completedScenarios.includes(token);
      }
      const chapterIndex = Number.parseInt(token, 10);
      if (!Number.isFinite(chapterIndex) || chapterIndex < 1) return false;
      const chapter = campaign.chapters[chapterIndex - 1];
      if (!chapter) return false;
      return completedScenarios.includes(chapter.scenario);
    }
    // Scenario trigger: "scenario:05" matches directly
    if (inj.when.startsWith('scenario:')) {
      const scenarioId = inj.when.replace('scenario:', '');
      return completedScenarios.includes(scenarioId);
    }
    return false;
  });
}

/**
 * Build an execution graph from the campaign structure and learner's capture data.
 * Maps each campaign chapter to an execution node, marking confirmed when the
 * learner's captures show exfil from that chapter's scenario.
 */
export function buildExecutionGraph(
  campaign: CampaignDefinition,
  capturesByScenario: Record<string, Record<string, unknown>>,
): ExecutionNode[] {
  const nodes: ExecutionNode[] = [];

  for (const chapter of campaign.chapters) {
    const captures = capturesByScenario[chapter.scenario] || {};

    // Mock collectors usually return { captures: [...] }. Also accept flat exfil keys.
    let hasExfil = false;
    for (const payload of Object.values(captures)) {
      if (typeof payload !== 'object' || payload === null) continue;
      const obj = payload as Record<string, unknown>;
      if (obj.exfil || obj.env || obj.headers || obj.payload) {
        hasExfil = true;
        break;
      }
      for (const key of ['captures', 'events', 'beacons', 'publishes', 'prs'] as const) {
        if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > 0) {
          hasExfil = true;
          break;
        }
      }
      if (hasExfil) break;
    }

    // Beat → stage title only. Full chapter narrative is the description (no mid-word cuts).
    const stageTitles: Record<string, string> = {
      'Initial access': 'Initial Access',
      'Build compromise': 'Build Compromise',
      'Trusted-action takeover': 'Action Takeover',
      Persistence: 'Persistence',
      'Credential harvest': 'Credential Harvest',
      'Image poisoning': 'Image Poisoning',
      'The full chain': 'Full Chain',
      'The trusted release': 'Trusted Release',
    };

    nodes.push({
      stage: stageTitles[chapter.beat] || chapter.beat,
      description: chapter.narrative,
      severity: hasExfil ? 'critical' : 'info',
      source: `scenario ${chapter.scenario}`,
      confirmed: hasExfil,
      indicator: hasExfil ? 'exfil channel open' : undefined,
    });
  }

  return nodes;
}

/**
 * Compute a remediation grade from which items the learner has completed.
 * Returns a score (0–100) and which items were completed.
 */
export function gradeRemediation(
  remediation: CampaignRemediation[],
  completedFlags: string[],
): {
  totalPossible: number;
  earned: number;
  percentage: number;
  completedIds: string[];
  missingIds: string[];
} {
  const totalPossible = remediation.reduce((sum, r) => sum + r.weight, 0);
  const completedIds: string[] = [];
  const missingIds: string[] = [];

  for (const r of remediation) {
    if (completedFlags.includes(r.flag)) {
      completedIds.push(r.id);
    } else {
      missingIds.push(r.id);
    }
  }

  return {
    totalPossible,
    earned: totalPossible - missingIds.length > 0
      ? remediation.filter((r) => completedIds.includes(r.id)).reduce((sum, r) => sum + r.weight, 0)
      : 0,
    percentage: totalPossible > 0 ? Math.round((completedIds.reduce((sum, id) => {
      const item = remediation.find((r) => r.id === id);
      return sum + (item ? item.weight : 0);
    }, 0) / totalPossible) * 100) : 0,
    completedIds,
    missingIds,
  };
}
