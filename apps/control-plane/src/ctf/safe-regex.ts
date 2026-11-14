import { runInNewContext } from 'node:vm';

/**
 * Learner-supplied regexes run inside a throwaway vm context with a hard
 * timeout, so a catastrophic pattern like (a+)+$ cannot hang the control plane.
 * Nothing here touches the network or the filesystem; the only input is a
 * fixture string that ships with the repo.
 */

export const MAX_REGEX_LENGTH = 300;
const REGEX_TIMEOUT_MS = 100;

export class RegexRejected extends Error {}

export function safeRegexTest(source: string, text: string, flags = 'i'): boolean {
  if (source.length > MAX_REGEX_LENGTH) {
    throw new RegexRejected(`Regex is longer than ${MAX_REGEX_LENGTH} characters`);
  }
  try {
    return Boolean(
      runInNewContext('new RegExp(source, flags).test(text)', { source, flags, text }, { timeout: REGEX_TIMEOUT_MS }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/timed out/i.test(msg)) {
      throw new RegexRejected('Regex took too long to run against a fixture (possible catastrophic backtracking)');
    }
    throw new RegexRejected(`Invalid regex: ${msg}`);
  }
}
