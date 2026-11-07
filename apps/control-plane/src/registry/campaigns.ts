/** Campaign metadata shared across scenario groups. */

import fs from 'fs';
import path from 'path';
import { load } from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
}

/** One chapter in the campaign chain. */
export interface CampaignChapter {
  scenario: string;
  beat: string;
  narrative: string;
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

/** Known campaign slugs and their YAML paths. */
const CAMPAIGN_SLUGS = ['operation-quiet-carrier'];

/**
 * Load all campaign definitions. Cache on first call.
 */
let _cache: CampaignDefinition[] | null = null;

function _load(): CampaignDefinition[] {
  if (_cache) return _cache;

  try {
    const files = fs.readdirSync(CAMPAIGNS_DIR).filter((f) => f.endsWith('.yaml'));
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

/**
 * Get all campaigns as a compact summary list (alias for compatibility).
 */
export function listCampaignStatus(): Array<{ id: string; title: string; persona: string; tagline: string; chapterCount: number }> {
  return listCampaigns();
}

/**
 * Get a single campaign's full status by slug (alias for compatibility).
 */
export function getCampaignStatus(slug: string): CampaignDefinition | undefined {
  return getCampaign(slug);
}

/**
 * Get all campaigns as a compact summary list.
 */
export function listCampaigns(): Array<{ id: string; title: string; persona: string; tagline: string; chapterCount: number }> {
  return _load().map((c) => ({
    id: c.id,
    title: c.title,
    persona: c.persona,
    tagline: c.tagline,
    chapterCount: c.chapters.length,
  }));
}

/**
 * Get a single campaign by slug.
 */
export function getCampaign(slug: string): CampaignDefinition | undefined {
  return _load().find((c) => c.id === slug);
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
    // Chapter beat trigger: "chapter:01" matches completed chapter scenarios
    if (inj.when.startsWith('chapter:')) {
      const chapterIndex = parseInt(inj.when.replace('chapter:', ''), 10);
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
    const hasData = Object.keys(captures).length > 0;

    // Check for exfil-specific capture keys
    let hasExfil = false;
    for (const payload of Object.values(captures)) {
      if (typeof payload !== 'object' || payload === null) continue;
      const obj = payload as Record<string, unknown>;
      if (obj.exfil || obj.env || obj.headers || obj.payload) {
        hasExfil = true;
        break;
      }
    }

    // Map chapter beat to stage description
    const stageMap: Record<string, { stage: string; desc: string }> = {
      'Initial access': {
        stage: 'Initial Access',
        desc: `Misnamed dependency install (${chapter.narrative.substring(0, 60)}…)`,
      },
      'Build compromise': {
        stage: 'Build Compromise',
        desc: `CI pipeline access gained via initial foothold (${chapter.narrative.substring(0, 60)}…)`,
      },
      'Trusted-action takeover': {
        stage: 'Action Takeover',
        desc: `Trusted action moved to execute attacker code with CI secrets (${chapter.narrative.substring(0, 60)}…)`,
      },
      'Persistence': {
        stage: 'Persistence',
        desc: `Registry mirror poisoned to maintain long-term access (${chapter.narrative.substring(0, 60)}…)`,
      },
    };

    const mapping = stageMap[chapter.beat] || {
      stage: chapter.beat,
      desc: chapter.narrative.substring(0, 80),
    };

    nodes.push({
      stage: mapping.stage,
      description: mapping.desc,
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
