import { StateEntry } from '@/types/stream';

/**
 * Places on the stream list that new streams compete for. Must equal the stream aggregator's
 * `MAX_STATE_SIZE` (default 10), which refuses a create once they are all taken. Archived recordings,
 * the list's external entries, sit outside this limit.
 */
export const STREAM_LIST_ROLLING_LIMIT = 10;

export function countRollingEntries(entries: StateEntry[]): number {
  return entries.filter((entry) => !entry.isExternal).length;
}

export function isStreamListFull(entries: StateEntry[], limit = STREAM_LIST_ROLLING_LIMIT): boolean {
  return countRollingEntries(entries) >= limit;
}

export function streamListFullMessage(limit = STREAM_LIST_ROLLING_LIMIT): string {
  return (
    `The stream list is full: all ${limit} places are taken, so a new stream cannot be added right now. ` +
    'Delete a stream you no longer need in Stream Manager, or ask an admin to move a finished recording to the ' +
    'archive, then try again.'
  );
}

/**
 * Throws the creator-facing message when a new stream would not fit. The aggregator refuses such a create
 * too, but a refused message never comes back to the browser, so this is the only place the creator hears it.
 */
export function assertStreamListHasRoom(entries: StateEntry[], limit = STREAM_LIST_ROLLING_LIMIT): void {
  if (isStreamListFull(entries, limit)) {
    throw new Error(streamListFullMessage(limit));
  }
}
