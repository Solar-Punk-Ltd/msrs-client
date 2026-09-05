import { FeedIndex, Topic } from '@ethersphere/bee-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { StateType } from '@/types/stream';
import { makeFeedIdentifier } from '@/utils/network/bee';

import { ManifestFetcher, ManifestStateManager } from './ManifestManagement';

vi.mock('@/utils/shared/config', () => ({
  config: { readerBeeUrl: 'http://reader' },
}));

const OWNER = '6f2728386f8a47ef5ebe323721188e630ff0fde9';
const TOPIC = 'b347b89b-933c-424f-a3d1-403bdd270b25';
const FINAL_INDEX = 1704;
const MANIFEST = '#EXTM3U\n#EXT-X-ENDLIST\n';

const socPathFor = (index: number) =>
  `soc/${OWNER}/${makeFeedIdentifier(Topic.fromString(TOPIC), FeedIndex.fromBigInt(BigInt(index))).toString()}`;

describe('ManifestFetcher initial fetch', () => {
  const stateManager = ManifestStateManager.getInstance();
  const hexTopic = Topic.fromString(TOPIC).toString();
  const fetchMock = vi.fn(async (_input: RequestInfo | URL) => new Response(MANIFEST));

  beforeEach(() => {
    stateManager.clear(hexTopic);
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const requestedPath = () => String(fetchMock.mock.calls[0][0]);

  it('reads an archived recording marked external at the index its final manifest was written at', async () => {
    stateManager.setStreamMetadata(hexTopic, { state: StateType.VOD, isExternal: true, index: FINAL_INDEX });

    await new ManifestFetcher(stateManager, 'http://reader').fetch(`${OWNER}/${TOPIC}`);

    expect(requestedPath()).toContain(socPathFor(FINAL_INDEX));
    expect(requestedPath()).not.toContain(socPathFor(1));
  });

  it('reads an uploaded external stream at index 1 when it carries no index', async () => {
    stateManager.setStreamMetadata(hexTopic, { state: StateType.VOD, isExternal: true });

    await new ManifestFetcher(stateManager, 'http://reader').fetch(`${OWNER}/${TOPIC}`);

    expect(requestedPath()).toContain(socPathFor(1));
  });

  it('reads a normal recording at its own index', async () => {
    stateManager.setStreamMetadata(hexTopic, { state: StateType.VOD, index: FINAL_INDEX });

    await new ManifestFetcher(stateManager, 'http://reader').fetch(`${OWNER}/${TOPIC}`);

    expect(requestedPath()).toContain(socPathFor(FINAL_INDEX));
  });
});
