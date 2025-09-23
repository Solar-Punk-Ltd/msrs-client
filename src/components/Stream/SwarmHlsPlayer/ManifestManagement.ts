import { FeedIndex, Topic } from '@ethersphere/bee-js';
import Pqueue from 'p-queue';

import { makeFeedIdentifier } from '@/utils/bee';
import { config } from '@/utils/config';

interface TopicState {
  index: FeedIndex | null;
  manifest: string;
}

const manifestQueue = new Pqueue({
  concurrency: 1,
});

export class ManifestStateManager {
  private static instance: ManifestStateManager;
  private topics: Map<string, TopicState> = new Map();

  private constructor() {}

  public static getInstance(): ManifestStateManager {
    if (!ManifestStateManager.instance) {
      ManifestStateManager.instance = new ManifestStateManager();
    }
    return ManifestStateManager.instance;
  }

  getIndex(topicId: string): FeedIndex | null {
    return this.topics.get(topicId)?.index ?? null;
  }

  setIndex(topicId: string, index: FeedIndex | null): void {
    const topicState = this.getOrCreateTopicState(topicId);
    topicState.index = index;
  }

  updateManifest(topicId: string, newManifest: string): boolean {
    const topicState = this.getOrCreateTopicState(topicId);

    if (topicState.manifest.includes('#EXT-X-ENDLIST')) {
      return false;
    }

    const isFinalVOD = newManifest.includes('#EXT-X-ENDLIST');
    if (isFinalVOD) {
      topicState.manifest = newManifest;
      return false;
    }

    if (!topicState.manifest) {
      topicState.manifest = newManifest;
      return true;
    }

    const oldManifest = topicState.manifest;
    const oldSegments = this.getSegmentLines(oldManifest);
    const newSegments = this.getSegmentLines(newManifest);

    const isSegmentListSame =
      oldSegments.length === newSegments.length && oldSegments.every((line, i) => line === newSegments[i]);

    if (isSegmentListSame) return true;

    const lastKnownUri = oldSegments.length > 0 ? oldSegments.at(-1) : null;
    const indexOfLast = lastKnownUri ? newSegments.indexOf(lastKnownUri) : -1;

    const newOnly =
      indexOfLast >= 0 && indexOfLast < newSegments.length - 1
        ? newSegments.slice(indexOfLast + 1)
        : indexOfLast === newSegments.length - 1
        ? [] // same list, nothing new
        : newSegments;

    if (newOnly.length > 0) {
      const existingHeader = this.getHeaderLines(oldManifest);
      const headerHasPlaylistType = existingHeader.some((line) => line.startsWith('#EXT-X-PLAYLIST-TYPE'));
      const playlistHeader = headerHasPlaylistType ? existingHeader : [...existingHeader, '#EXT-X-PLAYLIST-TYPE:EVENT'];

      const combinedSegments = oldSegments.concat(newOnly);

      topicState.manifest = [...playlistHeader, ...combinedSegments].join('\n');
    }

    return true;
  }

  getLatestManifest(topicId: string, fallback = ''): string {
    const topicState = this.topics.get(topicId);
    return topicState?.manifest ?? fallback;
  }

  clear(topicId?: string): void {
    if (topicId) {
      this.topics.delete(topicId);
    } else {
      this.topics.clear();
    }
  }

  private getOrCreateTopicState(topicId: string): TopicState {
    if (!this.topics.has(topicId)) {
      this.topics.set(topicId, { index: null, manifest: '' });
    }
    return this.topics.get(topicId)!;
  }

  private getSegmentLines(manifest: string): string[] {
    const lines = manifest.trim().split('\n');
    const segmentLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXTINF')) {
        const extinf = lines[i];
        const uri = lines[i + 1];
        if (uri && !uri.startsWith('#')) {
          segmentLines.push(extinf + '\n' + uri);
        }
      }
    }

    return segmentLines;
  }

  private getHeaderLines(manifest: string): string[] {
    const lines = manifest.trim().split('\n');
    const headerLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#EXTINF')) break;
      headerLines.push(trimmed);
    }

    return headerLines;
  }
}

export class ManifestFetcher {
  constructor(
    private readonly stateManager: ManifestStateManager = ManifestStateManager.getInstance(),
    private readonly baseUrl: string = config.readerBeeUrl,
  ) {}

  async fetch(url: string): Promise<string> {
    const [owner, topicPart] = url.split('/');
    const topic = Topic.fromString(topicPart);

    if (!this.stateManager.getIndex(topic.toString())) {
      return this.handleInitialFetch(owner, topic);
    }
    return this.handleFollowupFetch(owner, topic);
  }

  private async handleInitialFetch(owner: string, topic: Topic): Promise<string> {
    const hexTopic = topic.toString();

    const res = await this.fetchResource(`feeds/${owner}/${hexTopic}`);
    const manifest = await res.text();

    const hasChanged = this.stateManager.updateManifest(hexTopic, manifest);
    if (hasChanged) {
      const index = this.extractIndex(res);
      this.stateManager.setIndex(hexTopic, index);
    }

    return manifest;
  }

  private async handleFollowupFetch(owner: string, topic: Topic): Promise<string> {
    const nextId = this.generateNextId(topic);
    const hexTopic = topic.toString();

    this.fetchResource(`soc/${owner}/${nextId}`)
      .then((res) => {
        manifestQueue.add(async () => {
          const manifest = await res.text();
          const hasChanged = this.stateManager.updateManifest(hexTopic, manifest);
          if (hasChanged) {
            const index = this.stateManager.getIndex(hexTopic)!;
            this.stateManager.setIndex(hexTopic, index.next());
          }
        });
      })
      .catch((error) => {
        console.error('Error fetching follow-up:', error);
      });

    return this.stateManager.getLatestManifest(hexTopic);
  }

  private generateNextId(topic: Topic): string {
    const currentIndex = this.stateManager.getIndex(topic.toString())!;
    const nextId = makeFeedIdentifier(topic, currentIndex.next());
    return nextId.toString();
  }

  private async fetchResource(path: string): Promise<Response> {
    const response = await fetch(`${this.baseUrl}/${path}`, {
      headers: {
        'swarm-chunk-retrieval-timeout': '2000ms',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${path}`);
    }
    return response;
  }

  private extractIndex(response: Response): FeedIndex {
    const hex = response.headers.get('Swarm-Feed-Index');
    if (!hex) throw new Error('Missing feed index header');
    return FeedIndex.fromBigInt(BigInt(`0x${hex}`));
  }
}
