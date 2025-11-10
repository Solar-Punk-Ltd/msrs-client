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
  pollingInterval?: NodeJS.Timeout;
  isPollingSetup?: boolean;
  isPollingRunning?: boolean;
}

export interface WakuMetadata {
  wakuTopic: string;
  contentTopic: string;
}
