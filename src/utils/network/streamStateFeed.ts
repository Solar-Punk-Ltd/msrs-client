import { Bee, BeeResponseError, FeedIndex, Topic } from '@ethersphere/bee-js';

import { StateArrayWithTimestamp } from '@/types/stream';
import { config } from '@/utils/shared/config';

/** Drops a poll that outlives its refetch interval instead of letting requests stack up. */
const POLL_TIMEOUT_MS = 5000;

const NOT_PUBLISHED_YET = 404;

const readerBee = new Bee(config.readerBeeUrl);
const streamStateTopic = Topic.fromString(config.streamStateTopic);

const streamStateReader = () =>
  readerBee.makeFeedReader(streamStateTopic, config.streamStateOwner, { timeout: POLL_TIMEOUT_MS });

export interface StreamStateAtIndex {
  state: StateArrayWithTimestamp;
  index: FeedIndex;
}

/**
 * Latest published stream list plus the feed index it came from, which seeds the incremental
 * polling done by `readStreamStateAt`.
 */
export async function readLatestStreamState(): Promise<StreamStateAtIndex> {
  const update = await streamStateReader().downloadPayload();

  return {
    state: JSON.parse(update.payload.toUtf8()) as StateArrayWithTimestamp,
    index: update.feedIndex,
  };
}

/**
 * The stream list at `index`, or null when the aggregator has not written that update yet.
 *
 * Payloads larger than one chunk are stored wrapped and resolved here transparently, so the
 * list is not limited to the 4096 bytes a single owner chunk holds inline.
 */
export async function readStreamStateAt(index: FeedIndex): Promise<StateArrayWithTimestamp | null> {
  try {
    const update = await streamStateReader().downloadPayload({ index });
    return JSON.parse(update.payload.toUtf8()) as StateArrayWithTimestamp;
  } catch (error) {
    if (error instanceof BeeResponseError && error.status === NOT_PUBLISHED_YET) {
      return null;
    }
    throw error;
  }
}
