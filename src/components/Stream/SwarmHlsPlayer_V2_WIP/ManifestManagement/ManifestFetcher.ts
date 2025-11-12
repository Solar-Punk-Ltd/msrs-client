import { FeedIndex, Topic } from '@ethersphere/bee-js';
import Pqueue from 'p-queue';

import { MessageReceiveMode } from '@/types/messaging';
import { makeFeedIdentifier } from '@/utils/network/bee';
import { config } from '@/utils/shared/config';

import { ManifestStateManager } from './ManifestStateManager';
import { SwarmFetcher } from './SwarmFetcher';

export class ManifestFetcher {
  private stateManager = ManifestStateManager.getInstance();

  private fetcher = new SwarmFetcher();
  private manifestQueue = new Pqueue({ concurrency: 1 });

  private inflight = new Map<string, Promise<string>>();
  private prefetchTimers = new Map<string, NodeJS.Timeout>();

  public async fetch(url: string): Promise<string> {
    if (this.inflight.has(url)) {
      return this.inflight.get(url)!;
    }

    const promise = this.doFetch(url).finally(() => {
      this.inflight.delete(url);
    });

    this.inflight.set(url, promise);
    return promise;
  }

  private async doFetch(url: string): Promise<string> {
    const [owner, topicPart] = url.split('/');
    const topic = Topic.fromString(topicPart);
    const hexTopic = topic.toString();

    const shouldUseWaku =
      config.messageReceiveMode === MessageReceiveMode.WAKU || config.messageReceiveMode === MessageReceiveMode.BOTH;

    if (shouldUseWaku) {
      await this.stateManager.isSubscriptionReady(hexTopic);
      return this.fetchWithWaku(hexTopic);
    } else {
      return this.fetchWithPolling(owner, topic);
    }
  }

  private async fetchWithWaku(hexTopic: string): Promise<string> {
    if (this.stateManager.isUsingWaku(hexTopic)) {
      const manifest = this.stateManager.getLatestManifest(hexTopic, '');
      if (manifest) {
        this.stateManager.updateManifest(hexTopic, manifest);
        return this.stateManager.getLatestManifest(hexTopic);
      }
      return '';
    }

    const state = this.stateManager.getTopicState(hexTopic);
    if (state?.manifest) {
      this.stateManager.updateManifest(hexTopic, state.manifest);
      return this.stateManager.getLatestManifest(hexTopic);
    }

    return '';
  }

  private async fetchWithPolling(owner: string, topic: Topic): Promise<string> {
    const hexTopic = topic.toString();
    const currentIndex = this.stateManager.getIndex(hexTopic);

    if (!currentIndex) {
      return this.initialPollingFetch(owner, topic);
    }
    return this.followupPollingFetch(owner, topic, currentIndex);
  }

  private async initialPollingFetch(owner: string, topic: Topic): Promise<string> {
    const hexTopic = topic.toString();

    try {
      const response = await this.fetcher.fetchFeed(owner, hexTopic);
      const manifest = await response.text();

      const hasChanged = this.stateManager.updateManifest(hexTopic, manifest);
      if (hasChanged) {
        const index = this.fetcher.extractIndex(response);
        this.stateManager.setIndex(hexTopic, index);
      }

      return manifest;
    } catch (error) {
      console.error('Initial fetch failed:', error);
      throw error;
    }
  }

  private async followupPollingFetch(owner: string, topic: Topic, currentIndex: FeedIndex): Promise<string> {
    const hexTopic = topic.toString();

    const cached = this.stateManager.getLatestManifest(hexTopic, '');

    const existingTimer = this.prefetchTimers.get(hexTopic);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.prefetchTimers.delete(hexTopic);
    }

    const prefetchDelay = cached ? 500 : 0;

    const timer = setTimeout(() => {
      this.prefetchTimers.delete(hexTopic);
      this.prefetchNextManifest(owner, topic, currentIndex);
    }, prefetchDelay);

    this.prefetchTimers.set(hexTopic, timer);

    if (cached) {
      return cached;
    }

    try {
      const nextId = makeFeedIdentifier(topic, currentIndex.next()).toString();
      const response = await this.fetcher.fetchSOC(owner, nextId);
      const manifest = await response.text();

      const hasChanged = this.stateManager.updateManifest(hexTopic, manifest);
      if (hasChanged) {
        this.stateManager.setIndex(hexTopic, currentIndex.next());
      }

      return manifest;
    } catch (error) {
      console.error('Synchronous fetch failed, returning stale manifest:', error);
      return this.stateManager.getLatestManifest(hexTopic, '');
    }
  }

  private async prefetchNextManifest(owner: string, topic: Topic, currentIndex: FeedIndex): Promise<void> {
    const hexTopic = topic.toString();
    const nextIndex = currentIndex.next();
    const nextId = makeFeedIdentifier(topic, nextIndex).toString();

    try {
      const response = await this.fetcher.fetchSOC(owner, nextId);

      await this.manifestQueue.add(async () => {
        try {
          const manifest = await response.text();
          const hasChanged = this.stateManager.updateManifest(hexTopic, manifest);

          if (hasChanged) {
            this.stateManager.setIndex(hexTopic, nextIndex);
          }
        } catch (error) {
          console.error('Failed to process prefetched manifest:', error);
        }
      });
    } catch (error) {
      console.debug('Prefetch attempt failed (normal during stream startup):', error);
    }
  }

  public cleanup(): void {
    for (const timer of this.prefetchTimers.values()) {
      clearTimeout(timer);
    }
    this.prefetchTimers.clear();
    this.inflight.clear();
    this.manifestQueue.clear();
  }
}
