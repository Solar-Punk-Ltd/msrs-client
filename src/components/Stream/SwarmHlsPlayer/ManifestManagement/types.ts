import type { FeedIndex } from '@ethersphere/bee-js';

export interface ManifestUpdate {
  streamId: string;
  sequence: number;
  manifest: string;
  isVod: boolean;
}

export interface TopicState {
  index: FeedIndex | null;
  manifest: string;
  lastSequence: number;
  wakuUnsubscribe?: () => Promise<void>;
  pollingTimeout?: NodeJS.Timeout;
  isPollingSetup?: boolean;
  pollSequence?: number;
  missCount?: number;
  lastPollTime?: number;
}

export interface WakuMetadata {
  wakuTopic: string;
  contentTopic: string;
}
