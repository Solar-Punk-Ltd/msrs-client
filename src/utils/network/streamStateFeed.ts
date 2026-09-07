import { Bee, BeeResponseError, FeedIndex, Topic } from '@ethersphere/bee-js';

import { StateArrayWithTimestamp } from '@/types/stream';
import { config } from '@/utils/shared/config';

/**
 * The first read has to find the newest feed update and, once the list is bigger than one chunk,
 * join it, which takes a cold reader several seconds. Measured 2.5 to 6 s through the gateway.
 */
export const INITIAL_READ_TIMEOUT_MS = 30_000;
/** A poll fetches one known chunk, so it is dropped when it outlives its refetch interval. */
export const POLL_TIMEOUT_MS = 5000;

const NOT_PUBLISHED_YET = 404;

const readerBee = new Bee(config.readerBeeUrl);
const streamStateTopic = Topic.fromString(config.streamStateTopic);

const streamStateReader = (timeout: number) =>
  readerBee.makeFeedReader(streamStateTopic, config.streamStateOwner, { timeout });

export interface StreamStateAtIndex {
  state: StateArrayWithTimestamp;
  index: FeedIndex;
}

/**
 * Latest published stream list plus the feed index it came from, which seeds the incremental
 * polling done by `readStreamStateAt`.
 */
export async function readLatestStreamState(): Promise<StreamStateAtIndex> {
  const update = await streamStateReader(INITIAL_READ_TIMEOUT_MS).downloadPayload();

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
    const update = await streamStateReader(POLL_TIMEOUT_MS).downloadPayload({ index });
    return JSON.parse(update.payload.toUtf8()) as StateArrayWithTimestamp;
  } catch (error) {
    if (error instanceof BeeResponseError && error.status === NOT_PUBLISHED_YET) {
      return null;
    }
    throw error;
  }
}
