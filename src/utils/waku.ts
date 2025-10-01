import {
  createDecoder,
  createLightNode,
  type Decoder,
  type IDecodedMessage,
  type LightNode,
  Protocols,
} from '@waku/sdk';
import { createHash } from 'crypto';

const WAKU_CLUSTER_ID = 1;

export class WakuSubscriber {
  private wakuNode: LightNode | null = null;
  private activeDecoders = new Map<string, Decoder>();

  public async initialize() {
    this.wakuNode = await createLightNode({
      defaultBootstrap: true,
      networkConfig: { clusterId: WAKU_CLUSTER_ID },
    });

    await this.wakuNode.start();
    await this.wakuNode.waitForPeers([Protocols.Filter], 30000);
    console.log('Waku subscriber initialized');
  }

  public async subscribe(
    topicName: string,
    callback: (message: IDecodedMessage) => void,
  ): Promise<() => Promise<void>> {
    if (!this.wakuNode || !this.wakuNode.isStarted()) {
      throw new Error('Waku node not initialized or not started');
    }

    // Derive shardId from topicName
    const hash = createHash('sha256').update(topicName).digest('hex');
    const NUM_SHARDS = 8;
    const hashInt = BigInt('0x' + hash);
    const shardId = Number(hashInt % BigInt(NUM_SHARDS));

    const contentTopic = `solarpunk-msrs/1/${topicName}/proto`;
    const decoder = createDecoder(contentTopic, {
      shardId,
      clusterId: WAKU_CLUSTER_ID,
      pubsubTopic: `/waku/2/rs/${WAKU_CLUSTER_ID}/${shardId}`,
    });

    const success = await this.wakuNode.filter.subscribe(decoder, callback);

    if (!success) {
      throw new Error(`Failed to subscribe to topic: ${topicName}`);
    }

    this.activeDecoders.set(topicName, decoder);

    // Return unsubscribe function
    return async () => {
      if (this.wakuNode && this.wakuNode.isStarted()) {
        const decoder = this.activeDecoders.get(topicName);
        if (decoder) {
          await this.wakuNode.filter.unsubscribe([decoder]);
          this.activeDecoders.delete(topicName);
        }
      }
    };
  }

  public async destroy() {
    if (this.wakuNode && this.wakuNode.isStarted()) {
      const decoders = Array.from(this.activeDecoders.values());
      if (decoders.length > 0) {
        await this.wakuNode.filter.unsubscribe(decoders);
      }
      this.activeDecoders.clear();

      await this.wakuNode.stop();
      this.wakuNode = null;
    }
  }
}
