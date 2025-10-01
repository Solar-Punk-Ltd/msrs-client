import { FeedIndex, Topic } from '@ethersphere/bee-js';
import type { IDecodedMessage } from '@waku/sdk';
import Pqueue from 'p-queue';
import protobuf from 'protobufjs';

import { makeFeedIdentifier } from '@/utils/bee';
import { config } from '@/utils/config';
import { WakuSubscriber } from '@/utils/waku';

const IS_WAKU_ENABLED = config.isWakuEnabled || false;

const ManifestUpdateProtoBuf = new protobuf.Type('ManifestUpdate')
  .add(new protobuf.Field('streamId', 1, 'string'))
  .add(new protobuf.Field('sequence', 2, 'uint32'))
  .add(new protobuf.Field('manifest', 3, 'string'))
  .add(new protobuf.Field('isVod', 4, 'bool'));

interface ManifestUpdate {
  streamId: string;
  sequence: number;
  manifest: string;
  isVod: boolean;
}

interface TopicState {
  index: FeedIndex | null;
  manifest: string;
  wakuUnsubscribe?: () => Promise<void>;
  lastSequence: number;
}

const manifestQueue = new Pqueue({
  concurrency: 1,
});

export class ManifestStateManager {
  private static instance: ManifestStateManager;
  private topics: Map<string, TopicState> = new Map();
  private wakuSubscriber: WakuSubscriber | null = null;
  private isWakuInitialized = false;

  private constructor() {
    if (IS_WAKU_ENABLED) {
      this.wakuSubscriber = new WakuSubscriber();
    }
  }

  public static getInstance(): ManifestStateManager {
    if (!ManifestStateManager.instance) {
      ManifestStateManager.instance = new ManifestStateManager();
    }
    return ManifestStateManager.instance;
  }

  // ===== Waku Methods =====
  private async initializeWaku() {
    if (!IS_WAKU_ENABLED || this.isWakuInitialized || !this.wakuSubscriber) {
      return;
    }

    await this.wakuSubscriber.initialize();
    this.isWakuInitialized = true;
  }

  async setupWakuSubscription(owner: string, topic: string): Promise<void> {
    if (!IS_WAKU_ENABLED || !this.wakuSubscriber) {
      throw new Error('Waku is not enabled');
    }

    await this.initializeWaku();

    const topicState = this.getOrCreateTopicState(topic);

    const wakuTopicName = `hls-manifest-${owner}-${topic}`;

    topicState.wakuUnsubscribe = await this.wakuSubscriber.subscribe(wakuTopicName, (message: IDecodedMessage) => {
      if (!message.payload) return;

      try {
        const decoded = this.decodeManifestUpdate(message.payload);
        this.handleWakuManifestUpdate(topic, decoded);
      } catch (error) {
        console.error('Failed to decode Waku message:', error);
      }
    });
  }

  private decodeManifestUpdate(payload: Uint8Array): ManifestUpdate {
    const decodedMessage = ManifestUpdateProtoBuf.decode(payload);

    const object = ManifestUpdateProtoBuf.toObject(decodedMessage, {
      longs: String,
      enums: String,
      bytes: String,
    });

    return {
      streamId: object.streamId,
      sequence: object.sequence,
      manifest: object.manifest,
      isVod: object.isVod || false,
    };
  }

  private handleWakuManifestUpdate(topicId: string, update: ManifestUpdate) {
    const topicState = this.topics.get(topicId);
    if (!topicState) return;

    // Check sequence order
    if (update.sequence <= topicState.lastSequence) {
      console.warn(`Out-of-order manifest: ${update.sequence} <= ${topicState.lastSequence}`);
      return;
    }

    topicState.lastSequence = update.sequence;
    topicState.manifest = update.manifest;

    // If VOD, cleanup
    if (update.isVod && topicState.wakuUnsubscribe) {
      topicState.wakuUnsubscribe();
      delete topicState.wakuUnsubscribe;
    }
  }

  // ===== Polling Methods (Legacy) =====
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
        ? []
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

  // ===== Common Methods =====
  getTopicState(topicId: string): TopicState | undefined {
    return this.topics.get(topicId);
  }

  async getLatestManifest(topicId: string, fallback = ''): Promise<string> {
    const topicState = this.topics.get(topicId);

    if (!topicState) {
      if (fallback) return fallback;
      throw new Error(`No topic state for ${topicId}`);
    }

    // Otherwise return current manifest immediately
    return topicState.manifest || fallback;
  }

  clear(topicId?: string): void {
    if (topicId) {
      const topicState = this.topics.get(topicId);
      if (topicState?.wakuUnsubscribe) {
        topicState.wakuUnsubscribe();
      }
      this.topics.delete(topicId);
    } else {
      for (const state of this.topics.values()) {
        if (state.wakuUnsubscribe) {
          state.wakuUnsubscribe();
        }
      }
      this.topics.clear();
    }
  }

  private getOrCreateTopicState(topicId: string): TopicState {
    if (!this.topics.has(topicId)) {
      this.topics.set(topicId, {
        index: null,
        manifest: '',
        lastSequence: -1,
      });
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

    if (!IS_WAKU_ENABLED) {
      return this.handlePollingFlow(owner, topic);
    }

    const cachedManifest = await this.tryGetCachedWakuManifest(hexTopic);
    if (cachedManifest !== null) {
      return cachedManifest;
    }

    // First fetch - need to determine if stream uses Waku
    try {
      const wakuManifest = await this.trySetupWakuStream(owner, topic, hexTopic);
      if (wakuManifest !== null) {
        return wakuManifest;
      }
      // Stream doesn't use Waku, fall back to polling
      return this.handlePollingFlow(owner, topic);
    } catch (error) {
      console.error('Error fetching initial feed:', error);
      // Fall back to polling on error
      return this.handlePollingFlow(owner, topic);
    }
  }

  private async tryGetCachedWakuManifest(hexTopic: string): Promise<string | null> {
    const topicState = this.stateManager.getTopicState(hexTopic);
    if (topicState?.wakuUnsubscribe) {
      return this.stateManager.getLatestManifest(hexTopic);
    }
    return null;
  }

  private async trySetupWakuStream(owner: string, topic: Topic, hexTopic: string): Promise<string | null> {
    const initialId = makeFeedIdentifier(topic, FeedIndex.fromBigInt(BigInt(0)));
    const res = await this.fetchResource(`soc/${owner}/${initialId.toString()}`);
    const data = await res.arrayBuffer();

    if (this.isWakuMetadata(new Uint8Array(data))) {
      // Stream uses Waku - setup subscription
      await this.stateManager.setupWakuSubscription(owner, hexTopic);
      return this.stateManager.getLatestManifest(hexTopic);
    }

    return null;
  }

  private isWakuMetadata(data: Uint8Array): boolean {
    try {
      const jsonStr = new TextDecoder().decode(data);
      const parsed = JSON.parse(jsonStr);
      return !!(parsed.wakuTopic && parsed.contentTopic);
    } catch {
      return false;
    }
  }

  private async handlePollingFlow(owner: string, topic: Topic): Promise<string> {
    const hexTopic = topic.toString();

    if (!this.stateManager.getIndex(hexTopic)) {
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
