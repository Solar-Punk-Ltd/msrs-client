import type { IDecodedMessage } from '@waku/sdk';

import type { StateEntry } from '@/types/stream';
import { config } from '@/utils/config';
import { WakuSubscriber } from '@/utils/waku';

import { decodeStreamList } from './StreamListDecoder';

export class WakuStreamManager {
  private wakuSubscriber: WakuSubscriber;
  private unsubscribe?: () => Promise<void>;
  private onUpdate?: (entries: StateEntry[]) => void;
  private waitingPromise?: {
    resolve: (entries: StateEntry[]) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  };
  private lastProcessedEntries: StateEntry[] | null = null;
  private lastMessageHash: string | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_DELAY = 3000;

  constructor() {
    this.wakuSubscriber = WakuSubscriber.getInstance();
  }

  isAvailable(): boolean {
    return config.isWakuEnabled;
  }

  async subscribe(onUpdate: (entries: StateEntry[]) => void): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Waku is not enabled');
    }

    this.onUpdate = onUpdate;

    const topicName = `${config.streamStateOwner.toLocaleLowerCase()}-${config.streamStateTopic}`;

    this.unsubscribe = await this.wakuSubscriber.subscribe(topicName, (message: IDecodedMessage) => {
      if (!message.payload) return;

      console.log('Received Waku message on topic:', topicName, message);
      try {
        const messageHash = Buffer.from(message.payload).toString('base64');

        if (this.lastMessageHash === messageHash) {
          console.log('Received duplicate message, ignoring...');
          return;
        }

        this.lastMessageHash = messageHash;
        const entries = decodeStreamList(message.payload);
        this.handleStreamListUpdate(entries);
      } catch (error) {
        console.error('Failed to decode stream list:', error);
      }
    });
  }

  private areEntriesEqual(entries1: StateEntry[] | null, entries2: StateEntry[]): boolean {
    if (!entries1) return false;
    return JSON.stringify(entries1) === JSON.stringify(entries2);
  }

  private handleStreamListUpdate(entries: StateEntry[]): void {
    if (this.areEntriesEqual(this.lastProcessedEntries, entries)) {
      console.log('Received duplicate stream list content, ignoring...');
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.lastProcessedEntries = [...entries];

      if (this.onUpdate) {
        this.onUpdate(entries);
      }

      if (this.waitingPromise) {
        clearTimeout(this.waitingPromise.timeout);
        this.waitingPromise.resolve(entries);
        this.waitingPromise = undefined;
      }

      this.debounceTimer = null;
    }, this.DEBOUNCE_DELAY);
  }

  async waitForStreamListChange(
    currentStreamList: StateEntry[],
    timeoutMs: number = 10000,
  ): Promise<StateEntry[] | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('Timeout waiting for stream list change');
        this.waitingPromise = undefined;
        resolve(null);
      }, timeoutMs);

      this.waitingPromise = {
        resolve: (entries: StateEntry[]) => {
          if (JSON.stringify(entries) !== JSON.stringify(currentStreamList)) {
            clearTimeout(timeout);
            resolve(entries);
          } else {
            console.log('Received same stream list, continuing to wait...');
          }
        },
        reject: (_error: Error) => {
          clearTimeout(timeout);
          resolve(null);
        },
        timeout,
      };
    });
  }

  async cleanup(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.waitingPromise) {
      clearTimeout(this.waitingPromise.timeout);
      this.waitingPromise = undefined;
    }

    if (this.unsubscribe) {
      await this.unsubscribe();
      this.unsubscribe = undefined;
    }

    this.lastProcessedEntries = null;
    this.lastMessageHash = null;
  }
}
