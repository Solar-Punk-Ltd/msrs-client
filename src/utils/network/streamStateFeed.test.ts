import { BeeResponseError, FeedIndex } from '@ethersphere/bee-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { makeFeedReader, downloadPayload } = vi.hoisted(() => ({ makeFeedReader: vi.fn(), downloadPayload: vi.fn() }));

vi.mock('@ethersphere/bee-js', async () => {
  const actual = await vi.importActual<typeof import('@ethersphere/bee-js')>('@ethersphere/bee-js');
  return {
    ...actual,
    Bee: vi.fn().mockImplementation(() => ({ makeFeedReader })),
  };
});

vi.mock('@/utils/shared/config', () => ({
  config: {
    readerBeeUrl: 'http://reader.test',
    streamStateTopic: 'swarm-stream',
    streamStateOwner: '352eabdea9cb05e984a8828d2a6df3d3b5023260',
  },
}));

import { INITIAL_READ_TIMEOUT_MS, POLL_TIMEOUT_MS, readLatestStreamState, readStreamStateAt } from './streamStateFeed';

const state = { entries: [], lastModified: 1 };
const payload = { toUtf8: () => JSON.stringify(state) };

describe('stream state feed reads', () => {
  beforeEach(() => {
    makeFeedReader.mockReset().mockReturnValue({ downloadPayload });
    downloadPayload.mockReset();
  });

  it('gives the first read, which has to look the feed up and join it, a long budget', async () => {
    downloadPayload.mockResolvedValue({ payload, feedIndex: FeedIndex.fromBigInt(BigInt(7)) });

    const result = await readLatestStreamState();

    expect(makeFeedReader).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      timeout: INITIAL_READ_TIMEOUT_MS,
    });
    expect(INITIAL_READ_TIMEOUT_MS).toBeGreaterThanOrEqual(6 * POLL_TIMEOUT_MS);
    expect(result.state).toEqual(state);
    expect(result.index.toString()).toBe('0000000000000007');
  });

  it('polls one known update with the short budget', async () => {
    downloadPayload.mockResolvedValue({ payload });

    await readStreamStateAt(FeedIndex.fromBigInt(BigInt(8)));

    expect(makeFeedReader).toHaveBeenCalledWith(expect.anything(), expect.anything(), { timeout: POLL_TIMEOUT_MS });
    expect(downloadPayload).toHaveBeenCalledWith({ index: FeedIndex.fromBigInt(BigInt(8)) });
  });

  it('treats a missing update as not published yet', async () => {
    downloadPayload.mockRejectedValue(
      new BeeResponseError('GET', 'http://reader.test/feeds', 'Not Found', 'not found', 404, 'Not Found'),
    );

    await expect(readStreamStateAt(FeedIndex.fromBigInt(BigInt(9)))).resolves.toBeNull();
  });
});
