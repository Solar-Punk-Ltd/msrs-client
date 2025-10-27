import { FeedIndex, Topic } from '@ethersphere/bee-js';

import { makeFeedIdentifier } from '@/utils/network/bee';
import { config } from '@/utils/shared/config';
import { WakuChannelManager } from '@/utils/waku/WakuChannelManager';

import { ManifestParser } from './ManifestParser';
import { SwarmFetcher } from './SwarmFetcher';
import type { ManifestUpdate, TopicState, WakuMetadata } from './types';
import { WakuManager } from './WakuManager';

export class ManifestStateManager {
  private static instance: ManifestStateManager;
  private topics = new Map<string, TopicState>();
  private subscriptionPromises = new Map<string, Promise<void>>();
  private wakuManager: WakuManager | null = null;
  private fetcher = new SwarmFetcher();

  private constructor() {}

  public static getInstance(): ManifestStateManager {
    if (!ManifestStateManager.instance) {
      ManifestStateManager.instance = new ManifestStateManager();
    }
    return ManifestStateManager.instance;
  }

  public setChannelManager(channelManager: WakuChannelManager | null): void {
    if (channelManager) {
      this.wakuManager = new WakuManager(channelManager);
    } else {
      this.wakuManager = null;
    }
  }

  public isWakuAvailable(): boolean {
    return this.wakuManager?.isAvailable() ?? false;
  }

  public isUsingWaku(topicId: string): boolean {
    return !!this.topics.get(topicId)?.wakuUnsubscribe;
  }

  public getTopicState(topicId: string): TopicState | undefined {
    return this.topics.get(topicId);
  }

  public getLatestManifest(topicId: string, fallback = ''): string {
    const state = this.topics.get(topicId);
    if (!state) {
      if (fallback) return fallback;
      throw new Error(`No topic state for ${topicId}`);
    }
    return state.manifest || fallback;
  }

  public async clear(topicId?: string): Promise<void> {
    if (topicId) {
      await this.cleanupTopic(topicId);
    } else {
      for (const id of this.topics.keys()) {
        await this.cleanupTopic(id);
      }
      this.topics.clear();
    }
  }

  public async setupStreamSubscription(owner: string, topic: Topic): Promise<void> {
    const hexTopic = topic.toString();

    const existingPromise = this.subscriptionPromises.get(hexTopic);
    if (existingPromise) return existingPromise;

    if (this.topics.get(hexTopic)?.wakuUnsubscribe) return;

    if (!config.isWakuEnabled) return;

    const promise = this.setupWakuStream(owner, topic, hexTopic);
    this.subscriptionPromises.set(hexTopic, promise);

    try {
      await promise;
    } finally {
      this.subscriptionPromises.delete(hexTopic);
    }
  }

  public async isSubscriptionReady(topicId: string): Promise<boolean> {
    const promise = this.subscriptionPromises.get(topicId);
    if (promise) {
      try {
        await promise;
      } catch {
        throw new Error('Waku subscription failed');
      }
    }
    return true;
  }

  public getIndex(topicId: string): FeedIndex | null {
    return this.topics.get(topicId)?.index ?? null;
  }

  public setIndex(topicId: string, index: FeedIndex | null): void {
    const state = this.getOrCreateTopicState(topicId);
    state.index = index;
  }

  public updateManifest(topicId: string, newManifest: string): boolean {
    const state = this.getOrCreateTopicState(topicId);

    const merged = ManifestParser.mergeManifests(state.manifest, newManifest);
    if (merged) {
      state.manifest = merged;
      return true;
    }
    return false;
  }

  private async setupWakuStream(owner: string, topic: Topic, hexTopic: string): Promise<void> {
    try {
      const metadata = await this.fetchWakuMetadata(owner, topic);
      if (!metadata) return;

      const isVod = await this.checkIfVod(owner, topic);
      if (isVod) return;

      await this.subscribeToWaku(hexTopic, metadata);
      await this.waitForFirstManifest(hexTopic, 5000);
    } catch (error) {
      console.error('Failed to setup Waku:', error);
    }
  }

  private async fetchWakuMetadata(owner: string, topic: Topic): Promise<WakuMetadata | null> {
    try {
      const id = makeFeedIdentifier(topic, FeedIndex.fromBigInt(BigInt(0)));
      const response = await this.fetcher.fetchSOC(owner, id.toString());
      const data = await response.json();

      if (data.wakuTopic && data.contentTopic) {
        return { wakuTopic: data.wakuTopic, contentTopic: data.contentTopic };
      }
    } catch {
      throw new Error('Failed to fetch Waku metadata');
    }
    return null;
  }

  private async checkIfVod(owner: string, topic: Topic): Promise<boolean> {
    try {
      const id = makeFeedIdentifier(topic, FeedIndex.fromBigInt(BigInt(1)));
      const response = await this.fetcher.fetchSOC(owner, id.toString());

      if (response.ok) {
        const manifest = await response.text();
        const state = this.getOrCreateTopicState(topic.toString());
        state.manifest = manifest;
        state.index = FeedIndex.fromBigInt(BigInt(1));
        return true;
      }
    } catch {
      // Index 1 not found - live stream
    }
    return false;
  }

  private async subscribeToWaku(topicId: string, metadata: WakuMetadata): Promise<void> {
    if (!this.wakuManager) {
      throw new Error('Waku manager not available');
    }

    const state = this.getOrCreateTopicState(topicId);

    state.wakuUnsubscribe = await this.wakuManager.subscribe(metadata, (message) => {
      if (!message.payload) return;

      try {
        if (!this.wakuManager) return;
        const update = this.wakuManager.decodeManifestUpdate(message.payload);
        this.handleWakuUpdate(topicId, update);
      } catch (error) {
        console.error('Failed to decode Waku message:', error);
      }
    });
  }

  private async handleWakuUpdate(topicId: string, update: ManifestUpdate): Promise<void> {
    const state = this.topics.get(topicId);
    if (!state) return;

    if (update.sequence <= state.lastSequence) return;

    state.lastSequence = update.sequence;
    state.manifest = update.manifest;

    if (update.isVod && state.wakuUnsubscribe) {
      await state.wakuUnsubscribe();
      delete state.wakuUnsubscribe;
    }
  }

  private async waitForFirstManifest(topicId: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const state = this.topics.get(topicId);
      if (!state || state.manifest) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => resolve(), timeoutMs);

      const interval = setInterval(() => {
        if (this.topics.get(topicId)?.manifest) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve();
        }
      }, 100);
    });
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

  private async cleanupTopic(topicId: string): Promise<void> {
    const state = this.topics.get(topicId);
    if (state?.wakuUnsubscribe) {
      await state.wakuUnsubscribe();
    }
    this.topics.delete(topicId);
  }
}
