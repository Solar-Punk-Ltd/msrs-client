import { FeedIndex, Topic } from '@ethersphere/bee-js';
import Pqueue from 'p-queue';

import { makeFeedIdentifier } from '@/utils/bee';
import { config } from '@/utils/config';

import { ManifestStateManager } from './ManifestStateManager';
import { SwarmFetcher } from './SwarmFetcher';

export class ManifestFetcher {
  private stateManager = ManifestStateManager.getInstance();
  private fetcher = new SwarmFetcher();
  private manifestQueue = new Pqueue({ concurrency: 1 });

  public async fetch(url: string): Promise<string> {
    const [owner, topicPart] = url.split('/');
    const topic = Topic.fromString(topicPart);
    const hexTopic = topic.toString();

    if (config.isWakuEnabled) {
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
    const nextId = makeFeedIdentifier(topic, currentIndex.next()).toString();

    // Prefetch next manifest asynchronously
    this.fetcher
      .fetchSOC(owner, nextId)
      .then((res) => {
        this.manifestQueue.add(async () => {
          try {
            const manifest = await res.text();
            const hasChanged = this.stateManager.updateManifest(hexTopic, manifest);

            if (hasChanged) {
              const index = this.stateManager.getIndex(hexTopic)!;
              this.stateManager.setIndex(hexTopic, index.next());
            }
          } catch (error) {
            console.error('Failed to process follow-up manifest:', error);
          }
        });
      })
      .catch((error) => {
        console.error('Failed to prefetch follow-up manifest:', error);
      });

    return this.stateManager.getLatestManifest(hexTopic);
  }
}
