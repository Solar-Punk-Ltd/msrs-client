import { FeedIndex, Topic } from '@ethersphere/bee-js';

import { MessageReceiveMode } from '@/types/messaging';
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
  private currentChannelManager: WakuChannelManager | null = null;
  private fetcher = new SwarmFetcher();

  private constructor() {}

  public static getInstance(): ManifestStateManager {
    if (!ManifestStateManager.instance) {
      ManifestStateManager.instance = new ManifestStateManager();
    }
    return ManifestStateManager.instance;
  }

  public async setChannelManager(channelManager: WakuChannelManager | null): Promise<void> {
    if (this.currentChannelManager === channelManager) {
      return;
    }

    if (this.currentChannelManager !== null && channelManager !== this.currentChannelManager) {
      console.log('[ManifestStateManager] Channel manager changed, cleaning up all subscriptions');
      await this.clear();
    }

    this.currentChannelManager = channelManager;

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

  public isUsingPolling(topicId: string): boolean {
    return !!this.topics.get(topicId)?.isPollingSetup;
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
    const messageReceiveMode = config.messageReceiveMode;

    const existingPromise = this.subscriptionPromises.get(hexTopic);
    if (existingPromise) return existingPromise;

    const state = this.topics.get(hexTopic);
    const wakuAlreadySetup = !!state?.wakuUnsubscribe;
    const pollingAlreadySetup = !!state?.isPollingSetup;

    const shouldUseWaku =
      messageReceiveMode === MessageReceiveMode.WAKU || messageReceiveMode === MessageReceiveMode.BOTH;
    const shouldUsePolling =
      messageReceiveMode === MessageReceiveMode.SWARM || messageReceiveMode === MessageReceiveMode.BOTH;

    const needsWakuSetup = shouldUseWaku && !wakuAlreadySetup;
    const needsPollingSetup = shouldUsePolling && !pollingAlreadySetup;

    if (!needsWakuSetup && !needsPollingSetup) {
      return;
    }

    const promise = this.setupStream(owner, topic, hexTopic, shouldUseWaku, shouldUsePolling);
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

  private async setupStream(
    owner: string,
    topic: Topic,
    hexTopic: string,
    shouldUseWaku: boolean,
    shouldUsePolling: boolean,
  ): Promise<void> {
    try {
      const isVod = await this.checkIfVod(owner, topic);

      if (isVod) {
        return;
      }

      if (shouldUseWaku) {
        const metadata = await this.fetchWakuMetadata(owner, topic);
        if (metadata) {
          await this.subscribeToWaku(hexTopic, metadata);
          await this.waitForFirstManifest(hexTopic, 5000);
          console.log('✅ Waku subscription setup for manifest updates');
        } else {
          console.warn('⚠️  Waku metadata not found, skipping Waku setup');
        }
      }

      if (shouldUsePolling) {
        await this.setupPolling(owner, topic, hexTopic);
        const mode = shouldUseWaku ? 'fallback' : 'primary';
        console.log(`✅ Polling setup for manifest updates (${mode} mode)`);
      }
    } catch (error) {
      console.error('Failed to setup stream:', error);
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
    const hexTopic = topic.toString();
    const state = this.getOrCreateTopicState(hexTopic);

    try {
      const response = await this.fetcher.fetchFeed(owner, hexTopic);
      const manifest = await response.text();
      const index = this.fetcher.extractIndex(response);

      const isVod = ManifestParser.isVOD(manifest);

      state.manifest = manifest;
      state.index = index;

      if (isVod) {
        console.log(`VOD stream detected, loaded complete manifest from index ${index}`);
        return true;
      }

      state.index = index.next();
      console.log(`Live stream detected, loaded manifest from index ${index}, ready to poll from ${index.next()}`);
      return false;
    } catch (error) {
      console.log('⏳ Feed not found yet, assuming live stream starting');
      return false;
    }
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

    if (update.sequence <= state.lastSequence) {
      console.log(`⏭️  Skipping Waku update with old sequence ${update.sequence} (current: ${state.lastSequence})`);
      return;
    }

    const hasChanged = this.updateManifest(topicId, update.manifest);

    if (hasChanged) {
      console.log(`📨 Waku delivered manifest update (sequence: ${update.sequence})`);
      state.lastSequence = update.sequence;

      if (update.isVod && state.wakuUnsubscribe) {
        console.log('🎬 Waku signaled VOD completion');
        await state.wakuUnsubscribe();
        delete state.wakuUnsubscribe;
      }
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

  private async setupPolling(owner: string, topic: Topic, hexTopic: string): Promise<void> {
    const state = this.getOrCreateTopicState(hexTopic);

    if (!state.index) {
      state.index = FeedIndex.fromBigInt(BigInt(1));
    }

    if (state.pollingTimeout) {
      clearTimeout(state.pollingTimeout);
      delete state.pollingTimeout;
    }

    // Use a sequence counter to prevent race conditions
    state.pollSequence = (state.pollSequence || 0) + 1;
    const currentSequence = state.pollSequence;
    state.isPollingSetup = true;
    state.missCount = 0;
    state.lastPollTime = 0;

    const pollManifest = async () => {
      const currentState = this.topics.get(hexTopic);

      if (!currentState || !currentState.isPollingSetup || currentState.pollSequence !== currentSequence) {
        console.log(`⏹️ Polling stopped for ${hexTopic}`);
        return;
      }

      const now = Date.now();
      if (currentState.lastPollTime && now - currentState.lastPollTime < 100) {
        currentState.pollingTimeout = setTimeout(pollManifest, 100);
        return;
      }
      currentState.lastPollTime = now;

      try {
        const currentIndex = currentState.index ?? FeedIndex.fromBigInt(BigInt(1));
        const id = makeFeedIdentifier(topic, currentIndex);

        const response = await this.fetcher.fetchSOC(owner, id.toString());

        if (response.ok) {
          const manifest = await response.text();

          if (ManifestParser.isVOD(manifest)) {
            console.log('🎬 Stream completed - VOD manifest received');
            this.updateManifest(hexTopic, manifest);

            delete currentState.isPollingSetup;
            delete currentState.pollSequence;
            delete currentState.missCount;
            delete currentState.lastPollTime;
            if (currentState.pollingTimeout) {
              clearTimeout(currentState.pollingTimeout);
              delete currentState.pollingTimeout;
            }
            return;
          }

          const hasChanged = this.updateManifest(hexTopic, manifest);

          if (hasChanged) {
            currentState.index = currentIndex.next();
            currentState.missCount = 0;

            currentState.pollingTimeout = setTimeout(pollManifest, 200);
          } else {
            // No change in manifest, slightly longer delay
            currentState.pollingTimeout = setTimeout(pollManifest, 1000);
          }
        } else if (response.status === 404) {
          // Not found - manifest not yet available
          currentState.missCount = (currentState.missCount || 0) + 1;

          const baseDelay = currentState.missCount < 3 ? 500 : 1000;
          const delay = Math.min(5000, baseDelay * Math.min(currentState.missCount, 5));

          currentState.pollingTimeout = setTimeout(pollManifest, delay);
        } else {
          console.error(`Polling error (status ${response.status}), retrying...`);
          currentState.pollingTimeout = setTimeout(pollManifest, 2000);
        }
      } catch (error) {
        console.error('Polling exception:', error);

        const currentState = this.topics.get(hexTopic);
        if (currentState && currentState.pollSequence === currentSequence) {
          currentState.pollingTimeout = setTimeout(pollManifest, 1500);
        }
      }
    };

    await pollManifest();
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
    if (!state) return;

    if (state.wakuUnsubscribe) {
      try {
        await state.wakuUnsubscribe();
      } catch (error) {
        console.error('Error unsubscribing from Waku:', error);
      }
    }

    if (state.pollingTimeout) {
      clearTimeout(state.pollingTimeout);
    }

    state.pollSequence = -1;

    this.topics.delete(topicId);
  }
}
