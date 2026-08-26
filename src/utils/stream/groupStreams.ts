import { StateEntry, StateType } from '@/types/stream';

export interface GroupedStreams {
  live: StateEntry[];
  next: StateEntry | null;
  upcoming: StateEntry[];
  past: StateEntry[];
}

const scheduledTime = (stream: StateEntry): number => {
  if (!stream.scheduledStartTime) return Number.POSITIVE_INFINITY;
  const time = Date.parse(stream.scheduledStartTime);
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

/**
 * Splits a stream list into schedule-based sections:
 * - live: currently live streams, most recently updated first
 * - next: the featured upcoming stream — a pinned scheduled stream if present,
 *   otherwise the dated scheduled stream with the earliest future start time,
 *   otherwise the earliest scheduled stream (undated entries sort last)
 * - upcoming: remaining scheduled streams, soonest first
 * - past: VODs, newest first
 */
export function groupStreams(streams: StateEntry[], now: number = Date.now()): GroupedStreams {
  const live = streams.filter((s) => s.state === StateType.LIVE).sort((a, b) => b.updatedAt - a.updatedAt);

  const scheduled = streams
    .filter((s) => s.state === StateType.SCHEDULED)
    .sort((a, b) => scheduledTime(a) - scheduledTime(b));

  const past = streams.filter((s) => s.state === StateType.VOD).sort((a, b) => b.createdAt - a.createdAt);

  const next =
    scheduled.find((s) => s.pinned) ??
    scheduled.find((s) => {
      const t = scheduledTime(s);
      return t !== Number.POSITIVE_INFINITY && t >= now;
    }) ??
    scheduled[0] ??
    null;

  const upcoming = scheduled.filter((s) => s !== next);

  return { live, next, upcoming, past };
}
