import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaType, StateEntry, StateType } from '@/types/stream';

const { uploadFile, socUpload, readLatestEntries } = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  socUpload: vi.fn(),
  readLatestEntries: vi.fn(),
}));

vi.mock('@/utils/network/streamStateFeed', () => ({ readLatestEntries }));

vi.mock('@ethersphere/bee-js', () => ({
  Bee: vi.fn().mockImplementation(() => ({
    uploadFile,
    makeSOCWriter: () => ({ upload: socUpload }),
  })),
  Bytes: { fromUtf8: () => ({ toUint8Array: () => new Uint8Array() }) },
  Identifier: { fromString: () => ({}) },
  PrivateKey: vi.fn(),
}));

vi.mock('../auth/login', () => ({
  createStreamAggregatorToken: vi.fn().mockResolvedValue('signed-token'),
}));

vi.mock('../shared/config', () => ({
  config: {
    writerBeeUrl: 'http://writer.test',
    readerBeeUrl: 'http://reader.test',
    streamerGsocTopic: 'topic',
    streamerGsocResourceId: 'resource',
    stamp: 'stamp',
  },
}));

import { createStream } from './stream';
import { streamListFullMessage, streamListUnreadableMessage } from './streamListCapacity';

const session = { userId: 'owner' } as never;
const meta = {
  title: 'New stream',
  description: '',
  thumbnail: new File(['img'], 'thumb.png', { type: 'image/png' }),
  mediaType: MediaType.VIDEO,
  tags: [],
} as never;

const listOf = (count: number): StateEntry[] =>
  Array.from({ length: count }, (_, i) => ({
    owner: 'owner',
    topic: `s${i}`,
    title: `s${i}`,
    state: StateType.VOD,
    mediaType: MediaType.VIDEO,
  })) as StateEntry[];

describe('createStream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadFile.mockResolvedValue({ reference: { toHex: () => 'ref' } });
    readLatestEntries.mockResolvedValue(listOf(9));
  });

  it('refuses when a place was taken after the form loaded its copy of the list', async () => {
    readLatestEntries.mockResolvedValueOnce(listOf(10));

    await expect(createStream(session, meta, listOf(9))).rejects.toThrow(streamListFullMessage());

    expect(readLatestEntries).toHaveBeenCalledTimes(1);
    expect(uploadFile).not.toHaveBeenCalled();
    expect(socUpload).not.toHaveBeenCalled();
  });

  it('refuses and says it could not check when the newest list cannot be read', async () => {
    // Sending anyway could meet a full list, and the aggregator's refusal never reaches the browser.
    readLatestEntries.mockRejectedValueOnce(new Error('gateway timeout'));

    await expect(createStream(session, meta, listOf(9))).rejects.toThrow(streamListUnreadableMessage());

    expect(uploadFile).not.toHaveBeenCalled();
    expect(socUpload).not.toHaveBeenCalled();
  });

  it('refuses before uploading anything when the stream list is full', async () => {
    await expect(createStream(session, meta, listOf(10))).rejects.toThrow(streamListFullMessage());

    expect(uploadFile).not.toHaveBeenCalled();
    expect(socUpload).not.toHaveBeenCalled();
  });

  it('sends the create when a place is free', async () => {
    await createStream(session, meta, listOf(9));

    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(socUpload).toHaveBeenCalledTimes(1);
  });
});
