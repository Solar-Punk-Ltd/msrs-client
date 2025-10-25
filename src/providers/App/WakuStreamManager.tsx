import type { LightNode } from '@waku/sdk';

import type { StateEntry } from '@/types/stream';
import { config } from '@/utils/shared/config';
import { WakuChannelManager } from '@/utils/waku/WakuChannelManager';

import { decodeStreamList } from './StreamListDecoder';

class MessageCache {
  private cache = new Set<string>();
  private static readonly MAX_SIZE = 100;

  has(hash: string): boolean {
    return this.cache.has(hash);
  }

  add(hash: string): void {
    if (this.cache.size >= MessageCache.MAX_SIZE) {
      const entriesToDelete = Math.floor(MessageCache.MAX_SIZE / 2);
      const iterator = this.cache.values();
      for (let i = 0; i < entriesToDelete; i++) {
        const { value } = iterator.next();
        if (value) {
          this.cache.delete(value);
        }
      }
    }
    this.cache.add(hash);
  }

  clear(): void {
    this.cache.clear();
  }
}

interface WaitingPromise {
  resolve: (entries: StateEntry[] | null) => void;
  timeout: NodeJS.Timeout;
  currentStreamListSnapshot: string;
}

export class WakuStreamManager {
  private channelManager: WakuChannelManager;
  private unsubscribe?: () => Promise<void>;
  private onUpdate?: (entries: StateEntry[]) => void;

  private readonly messageCache = new MessageCache();

  private lastProcessedContentHash: string | null = null;
  private lastProcessedTimestamp: number = 0;

  private waitingPromise?: WaitingPromise;

  constructor(node: LightNode, initialEntries: StateEntry[] | null) {
    this.channelManager = new WakuChannelManager();
    this.channelManager.setNode(node);

    if (initialEntries && Array.isArray(initialEntries) && initialEntries.length > 0) {
      this.lastProcessedTimestamp = WakuStreamManager.getLatestTimestamp(initialEntries);
      this.lastProcessedContentHash = this.createContentHash(initialEntries);
      console.log(
        `[WakuStreamManager] Initialized with ${initialEntries.length} entries, timestamp: ${this.lastProcessedTimestamp}`,
      );
    }
  }

  private static getLatestTimestamp(streams: StateEntry[]): number {
    return Math.max(...streams.map((stream) => stream.updatedAt || stream.createdAt || 0));
  }

  private cancelCurrentWaitingPromise(): void {
    if (this.waitingPromise) {
      clearTimeout(this.waitingPromise.timeout);
      this.waitingPromise.resolve(null);
      this.waitingPromise = undefined;
      console.log('[WakuStreamManager] Cancelled waiting promise');
    }
  }

  private resolveWaitingPromiseIfNeeded(entries: StateEntry[]): void {
    if (!this.waitingPromise) return;

    const newSnapshot = JSON.stringify(entries);

    if (newSnapshot !== this.waitingPromise.currentStreamListSnapshot) {
      clearTimeout(this.waitingPromise.timeout);
      this.waitingPromise.resolve(entries);
      this.waitingPromise = undefined;
      console.log('[WakuStreamManager] Resolved waiting promise with new data');
    } else {
      console.log('[WakuStreamManager] Data matches snapshot, continuing to wait...');
    }
  }

  async subscribe(onUpdate: (entries: StateEntry[]) => void): Promise<void> {
    this.onUpdate = onUpdate;

    const topicName = `${config.streamStateOwner.toLowerCase()}-${config.streamStateTopic.toLocaleLowerCase()}`;
    const channelName = 'solarpunk-msrs-stream-channel';

    this.unsubscribe = await this.channelManager.subscribe(channelName, topicName, (message: any) => {
      this.processIncomingMessage(message, topicName);
    });
  }

  private processIncomingMessage(message: any, topicName: string): void {
    if (!message.payload) {
      console.warn('[WakuStreamManager] Received message without payload');
      return;
    }

    console.log('[WakuStreamManager] Received message on topic:', topicName);

    try {
      const messageHash = this.createMessageHash(message.payload);

      const e = decodeStreamList(message.payload);
      console.log('Decoded entries:', e);

      if (this.messageCache.has(messageHash)) {
        console.log(`[DEBUG] Duplicate message detected: ${messageHash}`);
        return;
      }

      this.messageCache.add(messageHash);

      const entries = decodeStreamList(message.payload);

      if (!Array.isArray(entries) || entries.length === 0) {
        console.warn('[WakuStreamManager] Decoded invalid or empty stream list');
        return;
      }

      this.handleStreamListUpdate(entries);
    } catch (error) {
      console.error('[WakuStreamManager] Failed to process message:', error);
    }
  }

  private createMessageHash(payload: Uint8Array): string {
    return Buffer.from(payload).toString('base64');
  }

  private createContentHash(entries: StateEntry[]): string {
    const contentSignature = entries
      .map((entry) => `${entry.topic}:${entry.owner}:${entry.updatedAt || entry.createdAt}:${entry.state}`)
      .sort()
      .join('|');
    return Buffer.from(contentSignature).toString('base64');
  }

  private hasNewerContent(entries: StateEntry[]): boolean {
    const maxTimestamp = WakuStreamManager.getLatestTimestamp(entries);

    if (maxTimestamp < this.lastProcessedTimestamp) {
      console.log('[WakuStreamManager] Received older timestamp data, ignoring...');
      return false;
    }

    const currentContentHash = this.createContentHash(entries);

    if (maxTimestamp === this.lastProcessedTimestamp && this.lastProcessedContentHash === currentContentHash) {
      console.log('[WakuStreamManager] Same timestamp and content hash, ignoring...');
      return false;
    }

    return true;
  }

  private handleStreamListUpdate(entries: StateEntry[]): void {
    if (!this.hasNewerContent(entries)) {
      console.log('[WakuStreamManager] Skipping update - not newer than current state');
      return;
    }

    this.lastProcessedTimestamp = WakuStreamManager.getLatestTimestamp(entries);
    this.lastProcessedContentHash = this.createContentHash(entries);

    console.log(`[WakuStreamManager] Processing update with ${entries.length} entries`);

    if (this.onUpdate) {
      this.onUpdate(entries);
    }

    this.resolveWaitingPromiseIfNeeded(entries);
  }

  async waitForStreamListChange(
    currentStreamList: StateEntry[],
    timeoutMs: number = 10000,
  ): Promise<StateEntry[] | null> {
    this.cancelCurrentWaitingPromise();

    return new Promise((resolve) => {
      const currentSnapshot = JSON.stringify(currentStreamList);

      const timeout = setTimeout(() => {
        console.warn('[WakuStreamManager] Timeout waiting for stream list change');
        if (this.waitingPromise) {
          this.waitingPromise = undefined;
        }
        resolve(null);
      }, timeoutMs);

      this.waitingPromise = {
        resolve,
        timeout,
        currentStreamListSnapshot: currentSnapshot,
      };

      console.log(`[WakuStreamManager] Waiting for stream list change (timeout: ${timeoutMs}ms)...`);
    });
  }

  async cleanup(): Promise<void> {
    if (this.waitingPromise) {
      clearTimeout(this.waitingPromise.timeout);
      this.waitingPromise.resolve(null);
      this.waitingPromise = undefined;
    }

    if (this.unsubscribe) {
      await this.unsubscribe();
      this.unsubscribe = undefined;
    }

    await this.channelManager.destroy();

    this.messageCache.clear();

    this.lastProcessedContentHash = null;
    this.lastProcessedTimestamp = 0;
    this.onUpdate = undefined;
  }
}
