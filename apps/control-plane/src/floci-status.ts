import type { ScenarioFloci } from './registry/types.js';
import { buildLabEnv } from './env.js';

export interface FlociCall {
  when: string;
  script: string;
  what: string;
}

export interface FlociRuntime {
  /** Attack step shells out to floci-upload-json.sh when SCAS_FLOCI_ENABLED=1. */
  attackCalls: boolean;
  enabled: boolean;
  endpoint: string;
  reachable: boolean;
  bucket: string;
  calls: FlociCall[];
  /** Extra CLI work this scenario's seed script does, when it is more than an S3 baseline. */
  seedNote?: string;
}

const NO_ATTACK_CALL = new Set<string>();

const SHARED_SEED =
  'Every seed creates an IAM role, an SSM pipeline parameter, an SQS queue, an SNS topic, a CloudWatch log line, and an EventBridge seed event.';

const SEED_NOTES: Record<string, string> = {
  '01': `${SHARED_SEED} Also a Secrets Manager lookalike npm token.`,
  '03': `${SHARED_SEED} Also a Secrets Manager lookalike npm token.`,
  '04': `${SHARED_SEED} Also a Secrets Manager lookalike npm token.`,
  '05': `${SHARED_SEED} Also lookalike CI secrets, and a CodePipeline. The attack step now calls floci-upload-json.sh, which then writes logs, SQS, SNS, EventBridge, and STS.`,
  '06': `${SHARED_SEED} This lab's own seed also writes worm SQS, SNS, EventBridge, and lookalike secrets.`,
  '08': `${SHARED_SEED} Also a CodePipeline, because the lockfile is a CI input.`,
  '09': `${SHARED_SEED} Also an SSM signing-key id and a Secrets Manager object.`,
  '10': `${SHARED_SEED} Also a CodePipeline.`,
  '11': `${SHARED_SEED} Also an ECR repository.`,
  '12': `${SHARED_SEED} Also a CodePipeline.`,
  '14': `${SHARED_SEED} Also ECR and an ECS cluster. push-compromised.sh and run-compromised-task.sh remain extra scripts.`,
  '15': `${SHARED_SEED} Also a Secrets Manager lookalike npm token.`,
  '17': `${SHARED_SEED} Also a CodePipeline, stage queues, and this lab's Step Functions state machine.`,
  '19': `${SHARED_SEED} This lab's own seed also creates the Glue database and the SBOM SSM parameter.`,
  '20': `${SHARED_SEED} The attack step calls floci-upload-json.sh when the flag is on.`,
  '21': `${SHARED_SEED} Also a CodePipeline and lookalike CI secrets.`,
  '22': `${SHARED_SEED} Also a Secrets Manager lookalike PyPI token.`,
  '23': `${SHARED_SEED} Also ECR, CodePipeline, and lookalike CI secrets. push-compromised.sh remains an extra script.`,
  '24': `${SHARED_SEED} Also a Secrets Manager lookalike npm token.`,
  '25': `${SHARED_SEED} Also a CodePipeline, an SSM github-pat parameter, and a Secrets Manager CI object.`,
};

function bucketFor(scenarioId: string): string {
  const n = Number(scenarioId);
  const padded = Number.isFinite(n) ? String(n).padStart(2, '0') : scenarioId;
  return `scas-sc${padded}-artifacts`;
}

async function endpointUp(endpoint: string): Promise<boolean> {
  try {
    const response = await fetch(`${endpoint.replace(/\/$/, '')}/_floci/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function probeFloci(scenarioId: string, floci?: ScenarioFloci): Promise<FlociRuntime> {
  const env = buildLabEnv();
  const enabled = env.SCAS_FLOCI_ENABLED === '1';
  const endpoint = env.SCAS_FLOCI_ENDPOINT || env.AWS_ENDPOINT_URL || 'http://127.0.0.1:4566';
  const bucket = bucketFor(scenarioId);
  const attackCalls = !NO_ATTACK_CALL.has(scenarioId);
  const calls: FlociCall[] = [];

  if (attackCalls) {
    const prefix = scenarioId === '17' ? 'chain/ and exfil/' : 'exfil/';
    calls.push({
      when: 'Attack step, only when SCAS_FLOCI_ENABLED=1',
      script: 'scripts/floci/floci-upload-json.sh',
      what: `PutObject into s3://${bucket}/${prefix}, then CloudWatch Logs, EventBridge, SQS, SNS, STS, and the CI IAM role. The terminal lists each one.`,
    });
  }

  if (floci?.seed) {
    calls.push({
      when: 'Seed button',
      script: floci.seed,
      what: `Creates s3://${bucket} through the Floci CLI (aws via scripts/floci/floci-bridge.sh).`,
    });
  }
  if (floci?.verify) {
    calls.push({
      when: 'Verify button',
      script: floci.verify,
      what: `Lists s3://${bucket} through the same CLI.`,
    });
  }

  if (!attackCalls && !floci) {
    calls.push({
      when: 'Only if you run the scripts yourself',
      script: 'infrastructure/floci/seed.sh and verify.sh',
      what: `Those scripts call the Floci CLI for s3://${bucket}. The attack step does not.`,
    });
  }

  return {
    attackCalls,
    enabled,
    endpoint,
    reachable: await endpointUp(endpoint),
    bucket,
    calls,
    seedNote: SEED_NOTES[scenarioId] ?? SHARED_SEED,
  };
}
