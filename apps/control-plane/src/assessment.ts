/**
 * Assessment layer: scoring, badges, and certificate data derived from the
 * existing per-scenario progress. Nothing here gates the labs - it recognizes
 * what the learner already did and gives the classroom a scoreboard.
 */
import { SCENARIOS } from './registry/scenarios.js';
import { loadLesson } from './registry/lesson-loader.js';
import { readProgress } from './progress.js';

export interface Badge {
  id: string;
  label: string;
  /** Why it was earned, shown on hover / in the certificate. */
  reason: string;
}

export interface LabScore {
  scenarioId: string;
  title: string;
  completed: boolean;
  quizPassed: boolean;
  quizScore?: number;
  quizTotal?: number;
  drillCorrect?: boolean;
  /** Points: completion 10, quiz pass 5, drill correct 5. */
  points: number;
}

export interface Assessment {
  totalPoints: number;
  maxPoints: number;
  labsCompleted: number;
  totalLabs: number;
  quizzesPassed: number;
  drillsCorrect: number;
  badges: Badge[];
  labs: LabScore[];
  /** True when every lab is complete and every quiz passed - certificate ready. */
  certificateReady: boolean;
}

const POINTS_COMPLETE = 10;
const POINTS_QUIZ = 5;
const POINTS_DRILL = 5;

export function buildAssessment(): Assessment {
  const progress = readProgress();
  const labs: LabScore[] = [];
  const badges: Badge[] = [];

  for (const s of SCENARIOS) {
    const lesson = loadLesson(s);
    if (!lesson) continue;
    const entry = progress.scenarios[s.id];
    const completedSteps = entry?.completedSteps?.length ?? 0;
    const completed = lesson.steps.length > 0 && completedSteps >= lesson.steps.length;

    const quizTotal = lesson.quiz?.length ?? 0;
    const quizPassed = quizTotal > 0 && !!entry?.quiz && entry.quiz.score >= Math.ceil(quizTotal * 0.999);
    const drillCorrect = lesson.drill ? entry?.drill?.correct : undefined;

    let points = 0;
    if (completed) points += POINTS_COMPLETE;
    if (quizPassed) points += POINTS_QUIZ;
    if (drillCorrect) points += POINTS_DRILL;

    labs.push({
      scenarioId: s.id,
      title: s.title,
      completed,
      quizPassed,
      quizScore: entry?.quiz?.score,
      quizTotal: quizTotal || undefined,
      drillCorrect,
      points,
    });
  }

  const labsCompleted = labs.filter((l) => l.completed).length;
  const quizzesPassed = labs.filter((l) => l.quizPassed).length;
  const drillsCorrect = labs.filter((l) => l.drillCorrect).length;
  const totalPoints = labs.reduce((n, l) => n + l.points, 0);
  const maxPoints = labs.reduce(
    (n, l) => n + POINTS_COMPLETE + (l.quizTotal ? POINTS_QUIZ : 0) + (l.drillCorrect !== undefined ? POINTS_DRILL : 0),
    0,
  );

  // Badges - earned, never granted for free.
  if (labsCompleted >= 1) {
    badges.push({ id: 'first-breach', label: 'First Breach', reason: 'Completed your first lab end to end.' });
  }
  if (drillsCorrect >= 1) {
    badges.push({ id: 'sharp-eye', label: 'Sharp Eye', reason: 'Caught a blind attack before the lab labeled it.' });
  }
  if (quizzesPassed >= 1) {
    badges.push({ id: 'detector', label: 'Detector', reason: 'Passed a blue-team quiz gate.' });
  }
  const half = Math.ceil(labs.length / 2);
  if (labsCompleted >= half && labs.length > 0) {
    badges.push({ id: 'half-cleared', label: 'Half Cleared', reason: `Completed ${half}+ labs.` });
  }
  if (labsCompleted === labs.length && labs.length > 0) {
    badges.push({ id: 'full-sweep', label: 'Full Sweep', reason: 'Completed every lab in the catalog.' });
  }
  const allQuizzed = labs.filter((l) => l.quizTotal).length;
  if (allQuizzed > 0 && quizzesPassed === allQuizzed) {
    badges.push({ id: 'blue-team', label: 'Blue Team', reason: 'Passed every quiz gate.' });
  }

  const certificateReady = labs.length > 0 && labsCompleted === labs.length && quizzesPassed === allQuizzed;

  return {
    totalPoints,
    maxPoints,
    labsCompleted,
    totalLabs: labs.length,
    quizzesPassed,
    drillsCorrect,
    badges,
    labs,
    certificateReady,
  };
}
