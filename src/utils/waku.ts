import { createDecoder, type Decoder, type IDecodedMessage, type LightNode } from '@waku/sdk';
import { createRoutingInfo } from '@waku/utils';

import { config } from './config';

const WAKU_CLUSTER_ID = 1;
const PEER_CHECK_INTERVAL = 30000;

export const networkConfig = {
  clusterId: WAKU_CLUSTER_ID,
  numShardsInCluster: 8,
};

export class WakuSubscriber {
  private static instance: WakuSubscriber;
  private activeDecoders = new Map<string, Decoder>();
  private wakuNode: LightNode | null = null;
  private peerCheckInterval: NodeJS.Timeout | null = null;
  private isCheckingPeers = false;

  private constructor() {}

  public static getInstance(): WakuSubscriber {
    if (!WakuSubscriber.instance) {
      WakuSubscriber.instance = new WakuSubscriber();
    }

    return WakuSubscriber.instance;
  }

  public setWakuNode(node: LightNode): void {
    if (this.wakuNode) {
      return;
    }
    this.wakuNode = node;
    this.startPeerChecking();
  }

  public async subscribe(
    topicName: string,
    callback: (message: IDecodedMessage) => void,
  ): Promise<() => Promise<void>> {
    if (!this.wakuNode) {
      throw new Error('Waku node not available');
    }

    const contentTopic = `/solarpunk-msrs/1/${topicName}/proto`;

    const routingInfo = createRoutingInfo(networkConfig, { contentTopic });

    const decoder = createDecoder(contentTopic, routingInfo);

    const success = await this.wakuNode.filter.subscribe(decoder, callback);

    if (!success) {
      throw new Error(`Failed to subscribe to topic: ${topicName}`);
    }

    this.activeDecoders.set(topicName, decoder);

    // Return unsubscribe function
    return async () => {
      if (this.wakuNode) {
        const decoder = this.activeDecoders.get(topicName);
        if (decoder) {
          await this.wakuNode.filter.unsubscribe([decoder]);
          this.activeDecoders.delete(topicName);
        }
      }
    };
  }

  private startPeerChecking(): void {
    if (this.peerCheckInterval) {
      return;
    }

    this.peerCheckInterval = setInterval(() => {
      this.checkPeersAndConnect();
    }, PEER_CHECK_INTERVAL);
  }

  private async checkPeersAndConnect(): Promise<void> {
    if (!this.wakuNode || this.isCheckingPeers) {
      return;
    }

    this.isCheckingPeers = true;

    try {
      const connectedPeers = await this.wakuNode.getConnectedPeers();

      console.log(`[WakuSubscriber] Connected peers: ${connectedPeers.length}`);

      if (connectedPeers.length === 0) {
        console.log('[WakuSubscriber] No connected peers, attempting to connect to static peer');
        await this.connectToStaticPeer();
      }
    } catch (error) {
      console.error('[WakuSubscriber] Error checking peers:', error);
    } finally {
      this.isCheckingPeers = false;
    }
  }

  private async connectToStaticPeer(): Promise<void> {
    if (!this.wakuNode) {
      return;
    }

    try {
      const staticPeer = config.wakuStaticPeer;
      if (!staticPeer) {
        console.warn('[WakuSubscriber] No static peer configured');
        return;
      }

      console.log(`[WakuSubscriber] Connecting to static peer: ${staticPeer}`);

      await this.wakuNode.dial(staticPeer);

      console.log('[WakuSubscriber] Successfully connected to static peer');
    } catch (error) {
      console.error('[WakuSubscriber] Failed to connect to static peer:', error);
    }
  }

  public async destroy() {
    if (this.peerCheckInterval) {
      clearInterval(this.peerCheckInterval);
      this.peerCheckInterval = null;
    }

    if (this.wakuNode) {
      const decoders = Array.from(this.activeDecoders.values());
      if (decoders.length > 0) {
        await this.wakuNode.filter.unsubscribe(decoders);
      }
      this.activeDecoders.clear();
    }
  }
}
