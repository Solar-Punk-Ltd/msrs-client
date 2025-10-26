import type { LightNode } from '@solarpunkltd/waku-sdk';

import type { StateArrayWithTimestamp, StateEntry } from '@/types/stream';
import { config } from '@/utils/shared/config';
import { WakuChannelManager } from '@/utils/waku/WakuChannelManager';

import { decodeStreamList } from './StreamListDecoder';

interface WaitingPromise {
  resolve: (stateArray: StateArrayWithTimestamp | null) => void;
  timeout: NodeJS.Timeout;
  currentStreamListSnapshot: string;
}

export class WakuStreamManager {
  private channelManager: WakuChannelManager;
  private unsubscribe?: () => Promise<void>;
  private onUpdate?: (entries: StateEntry[]) => void;

  private lastModified: number = 0;

  private waitingPromise?: WaitingPromise;

  constructor(node: LightNode, initialEntries: StateArrayWithTimestamp | null) {
    this.channelManager = new WakuChannelManager();
    this.channelManager.setNode(node);

    if (initialEntries && initialEntries.entries && initialEntries.entries.length > 0) {
      this.lastModified = initialEntries.lastModified;
      console.log(
        `[WakuStreamManager] Initialized with ${initialEntries.entries.length} entries, lastModified: ${this.lastModified}`,
      );
    }
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
      this.waitingPromise.resolve({
        entries,
        lastModified: this.lastModified,
      });
      this.waitingPromise = undefined;
      console.log('[WakuStreamManager] Resolved waiting promise with new data');
    } else {
      console.log('[WakuStreamManager] Data matches snapshot, continuing to wait...');
    }
  }

  async subscribe(onUpdate: (stateArray: StateArrayWithTimestamp) => void): Promise<void> {
    this.onUpdate = (entries: StateEntry[]) => {
      onUpdate({
        entries,
        lastModified: this.lastModified,
      });
    };

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
      const decoded = decodeStreamList(message.payload);
      console.log('Decoded data:', decoded);

      if (decoded && typeof decoded === 'object' && 'entries' in decoded && 'lastModified' in decoded) {
        const stateArray = decoded as unknown as StateArrayWithTimestamp;
        if (!stateArray.entries || !Array.isArray(stateArray.entries)) {
          console.warn('[WakuStreamManager] Decoded invalid state array');
          return;
        }
        this.handleStateArrayUpdate(stateArray);
      } else {
        console.warn('[WakuStreamManager] Decoded invalid data format');
        return;
      }
    } catch (error) {
      console.error('[WakuStreamManager] Failed to process message:', error);
    }
  }

  private hasNewerContent(stateArray: StateArrayWithTimestamp): boolean {
    if (stateArray.lastModified <= this.lastModified) {
      console.log(
        `[WakuStreamManager] Received older or same lastModified (${stateArray.lastModified} <= ${this.lastModified}), ignoring...`,
      );
      return false;
    }
    return true;
  }

  private handleStateArrayUpdate(stateArray: StateArrayWithTimestamp): void {
    if (!this.hasNewerContent(stateArray)) {
      console.log('[WakuStreamManager] Skipping update - not newer than current state');
      return;
    }

    this.lastModified = stateArray.lastModified;

    console.log(
      `[WakuStreamManager] Processing update with ${stateArray.entries.length} entries, lastModified: ${stateArray.lastModified}`,
    );

    if (this.onUpdate) {
      this.onUpdate(stateArray.entries);
    }

    this.resolveWaitingPromiseIfNeeded(stateArray.entries);
  }

  async waitForStreamListChange(
    currentStreamList: StateArrayWithTimestamp,
    timeoutMs: number = 10000,
  ): Promise<StateArrayWithTimestamp | null> {
    this.cancelCurrentWaitingPromise();

    return new Promise((resolve) => {
      const currentSnapshot = JSON.stringify(currentStreamList.entries);

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

    this.lastModified = 0;
    this.onUpdate = undefined;
  }
}
