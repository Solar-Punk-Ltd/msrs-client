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

export type StreamListCapacity = 'checking' | 'unknown' | 'room' | 'full';

interface StreamListLoadState {
  entries: StateEntry[];
  isLoading: boolean;
  hasError: boolean;
}

/**
 * Whether a new stream fits, or that it cannot be known yet. A list that has not been read looks exactly
 * like an empty one, so it only vouches for a free place once the first read has finished and succeeded.
 * A failed refresh after that still leaves the last list it read.
 */
export function streamListCapacity(
  { entries, isLoading, hasError }: StreamListLoadState,
  limit = STREAM_LIST_ROLLING_LIMIT,
): StreamListCapacity {
  if (isLoading) return 'checking';
  if (hasError && entries.length === 0) return 'unknown';
  return isStreamListFull(entries, limit) ? 'full' : 'room';
}

const NOT_YET_KNOWN_MESSAGES: Record<'checking' | 'unknown', string> = {
  checking: 'Checking whether the stream list has room for a new stream. This takes a few seconds.',
  unknown:
    'Could not check whether the stream list has room, so a new stream cannot be created right now. ' +
    'Reload the page and try again.',
};

/** What to tell the creator for every state that blocks a new stream, or null when there is room. */
export function streamListCapacityMessage(
  capacity: StreamListCapacity,
  limit = STREAM_LIST_ROLLING_LIMIT,
): string | null {
  if (capacity === 'room') return null;
  if (capacity === 'full') return streamListFullMessage(limit);
  return NOT_YET_KNOWN_MESSAGES[capacity];
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
