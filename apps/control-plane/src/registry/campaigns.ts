/**
 * Campaign mode: chains labs into one continuous intrusion with a persistent
 * attacker persona and an accumulating timeline. Campaigns live as YAML under
 * campaigns/ and are parsed with the same minimal YAML subset as lesson.yaml.
 *
 * A campaign never changes how labs run - it only orders them and wraps them in
 * a narrative. Progress is derived from the existing per-scenario progress, so
 * completing a lab in the storyboard advances the campaign map automatically.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { getRepoRoot } from '../env.js';
import { parseLessonYaml } from './parse-lesson-yaml.js';
import { SCENARIOS } from './scenarios.js';
import { loadLesson } from './lesson-loader.js';
import { readProgress } from '../progress.js';

export interface CampaignChapter {
  scenario: string;
  beat: string;
  narrative: string;
}

export interface CampaignDefinition {
  id: string;
  title: string;
  persona: string;
  tagline: string;
  description: string;
  chapters: CampaignChapter[];
  debrief: string;
}

export interface CampaignChapterStatus extends CampaignChapter {
  scenarioId: string;
  title: string;
  slug: string;
  completed: boolean;
  /** True when this is the next unfinished chapter. */
  current: boolean;
}

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

function campaignsDir(): string {
  return resolve(getRepoRoot(), 'campaigns');
}

function asStr(v: unknown, field: string): string {
  if (typeof v !== 'string' || !v.trim()) throw new Error(`campaign ${field} must be a non-empty string`);
  return v.trim();
}

function normalizeCampaign(raw: Record<string, unknown>, file: string): CampaignDefinition {
  const id = asStr(raw.id, 'id');
  const title = asStr(raw.title, 'title');
  const persona = asStr(raw.persona, 'persona');
  const tagline = asStr(raw.tagline, 'tagline');
  const description = asStr(raw.description, 'description');
  const debrief = asStr(raw.debrief, 'debrief');

  if (!Array.isArray(raw.chapters) || raw.chapters.length === 0) {
    throw new Error(`campaign ${id} (${file}) needs a non-empty chapters list`);
  }
  const known = new Set(SCENARIOS.map((s) => s.id));
  const chapters: CampaignChapter[] = raw.chapters.map((c, i) => {
    if (!c || typeof c !== 'object' || Array.isArray(c)) {
      throw new Error(`campaign ${id} chapters[${i}] must be a mapping`);
    }
    const m = c as Record<string, unknown>;
    const scenario = asStr(m.scenario, `chapters[${i}].scenario`);
    if (!known.has(scenario)) {
      throw new Error(`campaign ${id} chapters[${i}] references unknown scenario "${scenario}"`);
    }
    return {
      scenario,
      beat: asStr(m.beat, `chapters[${i}].beat`),
      narrative: asStr(m.narrative, `chapters[${i}].narrative`),
    };
  });

  return { id, title, persona, tagline, description, chapters, debrief };
}

export function loadCampaigns(): CampaignDefinition[] {
  const dir = campaignsDir();
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'))
    .sort();
  const out: CampaignDefinition[] = [];
  for (const file of files) {
    const raw = parseLessonYaml(readFileSync(resolve(dir, file), 'utf8'));
    out.push(normalizeCampaign(raw, file));
  }
  return out;
}

function scenarioCompleted(scenarioId: string): boolean {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) return false;
  const lesson = loadLesson(scenario);
  if (!lesson || lesson.steps.length === 0) return false;
  const entry = readProgress().scenarios[scenarioId];
  return (entry?.completedSteps?.length ?? 0) >= lesson.steps.length;
}

export function getCampaignStatus(id: string): CampaignStatus | null {
  const campaign = loadCampaigns().find((c) => c.id === id);
  if (!campaign) return null;

  let sawCurrent = false;
  const chapters: CampaignChapterStatus[] = campaign.chapters.map((ch) => {
    const scenario = SCENARIOS.find((s) => s.id === ch.scenario)!;
    const completed = scenarioCompleted(ch.scenario);
    const current = !completed && !sawCurrent;
    if (current) sawCurrent = true;
    return {
      ...ch,
      scenarioId: scenario.id,
      title: scenario.title,
      slug: scenario.slug,
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

export function listCampaignStatus(): CampaignStatus[] {
  return loadCampaigns().map((c) => getCampaignStatus(c.id)!) as CampaignStatus[];
}
