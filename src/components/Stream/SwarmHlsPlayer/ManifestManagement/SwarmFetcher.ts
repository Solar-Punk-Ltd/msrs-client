import { FeedIndex } from '@ethersphere/bee-js';

import { config } from '@/utils/shared/config';

export class SwarmFetcher {
  private baseUrl: string;

  constructor(baseUrl: string = config.readerBeeUrl) {
    this.baseUrl = baseUrl;
  }

  async fetchFeed(owner: string, topic: string): Promise<Response> {
    return this.fetch(`feeds/${owner}/${topic}?after=1`, false);
  }

  async fetchSOC(owner: string, id: string): Promise<Response> {
    return this.fetch(`soc/${owner}/${id}`, true);
  }

  private async fetch(path: string, withTimeout: boolean = false): Promise<Response> {
    const url = `${this.baseUrl}/${path}`;

    const controller = new AbortController();
    const timeoutId = withTimeout ? setTimeout(() => controller.abort(), 8000) : undefined;

    try {
      const response = await fetch(url, {
        headers: { 'swarm-chunk-retrieval-timeout': '2000ms' },
        signal: controller.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${response.status}`);
      }

      return response;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after 8 seconds: ${path}`);
      }
      throw error;
    }
  }

  extractIndex(response: Response): FeedIndex {
    const hex = response.headers.get('Swarm-Feed-Index');
    if (!hex) {
      throw new Error('Missing Swarm-Feed-Index header');
    }
    return FeedIndex.fromBigInt(BigInt(`0x${hex}`));
  }
}
