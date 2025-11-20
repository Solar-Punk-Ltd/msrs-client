import { FeedIndex, Topic } from '@ethersphere/bee-js';
import Pqueue from 'p-queue';

import { StateType } from '@/types/stream';
import { makeFeedIdentifier } from '@/utils/network/bee';
import { config } from '@/utils/shared/config';

interface TopicState {
  index: FeedIndex | null;
  manifest: string;
  metadata?: StreamMetadata;
}

export interface StreamMetadata {
  state?: StateType;
  isExternal?: boolean;
  index?: number;
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

  setStreamMetadata(topicId: string, metadata: StreamMetadata): void {
    const topicState = this.getOrCreateTopicState(topicId);
    topicState.metadata = metadata;
  }

  getStreamMetadata(topicId: string): StreamMetadata | undefined {
    return this.topics.get(topicId)?.metadata;
  }

  clearTopicState(topicId: string): void {
    this.topics.delete(topicId);
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
      this.topics.set(topicId, { index: null, manifest: '', metadata: undefined });
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
    const hexTopic = topic.toString();

    if (!this.stateManager.getIndex(hexTopic)) {
      return this.handleInitialFetch(owner, topic);
    }
    return this.handleFollowupFetch(owner, topic);
  }

  private async handleInitialFetch(owner: string, topic: Topic): Promise<string> {
    const hexTopic = topic.toString();
    const streamMetadata = this.stateManager.getStreamMetadata(hexTopic);

    // If stream is external, always use SOC with index 1
    if (streamMetadata?.isExternal) {
      console.log('External stream detected, using SOC index 1');
      const index1 = FeedIndex.fromBigInt(BigInt(1));
      const socId = makeFeedIdentifier(topic, index1).toString();
      const res = await this.fetchResource(`soc/${owner}/${socId}`);
      const manifest = await res.text();

      const hasChanged = this.stateManager.updateManifest(hexTopic, manifest);
      if (hasChanged) {
        this.stateManager.setIndex(hexTopic, index1);
      }

      return manifest;
    }

    // If VOD and we have the index from stateEntry, fetch directly
    if (streamMetadata?.state === StateType.VOD && streamMetadata.index) {
      console.log(`VOD stream detected, fetching directly with index ${streamMetadata.index}`);
      const vodIndex = FeedIndex.fromBigInt(BigInt(streamMetadata.index));
      const socId = makeFeedIdentifier(topic, vodIndex).toString();

      try {
        const res = await this.fetchResource(`soc/${owner}/${socId}`);
        const manifest = await res.text();

        const hasChanged = this.stateManager.updateManifest(hexTopic, manifest);
        if (hasChanged) {
          this.stateManager.setIndex(hexTopic, vodIndex);
        }

        return manifest;
      } catch (error) {
        console.log('VOD index fetch failed, falling back to feeds:', error);
      }
    }

    // For LIVE streams or fallback, use feeds endpoint
    try {
      console.log('Live stream or fallback, using feeds endpoint');
      const res = await this.fetchResource(`feeds/${owner}/${hexTopic}`, { abortEnabled: true, timeout: 20000 });
      const manifest = await res.text();

      const hasChanged = this.stateManager.updateManifest(hexTopic, manifest);
      if (hasChanged) {
        const index = this.extractIndex(res);
        this.stateManager.setIndex(hexTopic, index);
      }

      return manifest;
    } catch (error) {
      console.log('Feeds fetch failed, falling back to SOC index 1:', error);

      const index1 = FeedIndex.fromBigInt(BigInt(1));
      const socId = makeFeedIdentifier(topic, index1).toString();
      const res = await this.fetchResource(`soc/${owner}/${socId}`);
      const manifest = await res.text();

      const hasChanged = this.stateManager.updateManifest(hexTopic, manifest);
      if (hasChanged) {
        this.stateManager.setIndex(hexTopic, index1);
      }

      return manifest;
    }
  }

  private async handleFollowupFetch(owner: string, topic: Topic): Promise<string> {
    const nextId = this.generateNextId(topic);
    const hexTopic = topic.toString();

    this.fetchResource(`soc/${owner}/${nextId}`, { abortEnabled: true, timeout: 5000 })
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

  private async fetchResource(path: string, options?: { abortEnabled?: boolean; timeout?: number }): Promise<Response> {
    const { abortEnabled = false, timeout = 8500 } = options ?? {};
    const controller = abortEnabled ? new AbortController() : null;
    const timeoutId = abortEnabled ? setTimeout(() => controller?.abort(), timeout) : null;

    try {
      const response = await fetch(`${this.baseUrl}/${path}`, {
        signal: controller?.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${path}`);
      }

      return response;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout: ${path}`);
      }
      throw error;
    }
  }

  private extractIndex(response: Response): FeedIndex {
    const hex = response.headers.get('Swarm-Feed-Index');
    if (!hex) throw new Error('Missing feed index header');
    return FeedIndex.fromBigInt(BigInt(`0x${hex}`));
  }
}
