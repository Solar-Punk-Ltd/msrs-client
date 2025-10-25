import { FeedIndex } from '@ethersphere/bee-js';

import { config } from '@/utils/shared/config';

export class SwarmFetcher {
  private baseUrl: string;

  constructor(baseUrl: string = config.readerBeeUrl) {
    this.baseUrl = baseUrl;
  }

  async fetchFeed(owner: string, topic: string): Promise<Response> {
    return this.fetch(`feeds/${owner}/${topic}`);
  }

  async fetchSOC(owner: string, id: string): Promise<Response> {
    return this.fetch(`soc/${owner}/${id}`);
  }

  private async fetch(path: string): Promise<Response> {
    const url = `${this.baseUrl}/${path}`;

    const response = await fetch(url, {
      headers: { 'swarm-chunk-retrieval-timeout': '2000ms' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.status}`);
    }

    return response;
  }

  extractIndex(response: Response): FeedIndex {
    const hex = response.headers.get('Swarm-Feed-Index');
    if (!hex) {
      throw new Error('Missing Swarm-Feed-Index header');
    }
    return FeedIndex.fromBigInt(BigInt(`0x${hex}`));
  }
}
