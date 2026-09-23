import { afterEach, describe, expect, it, vi } from 'vitest';

import { uploaderService } from './uploaderService';

describe('uploaderService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks for a move as its own job type, naming only the stream', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'm', type: 'move' })));
    vi.stubGlobal('fetch', fetchMock);

    await uploaderService.moveToArchivePart('secret', 'topic-1');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/admin\/uploader\/jobs$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ type: 'move', topic: 'topic-1' });
  });
});
