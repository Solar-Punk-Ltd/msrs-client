import { createDecoder, type Decoder, type IDecodedMessage, type LightNode } from '@waku/sdk';
import { createHash } from 'crypto';

const WAKU_CLUSTER_ID = 1;

export class WakuSubscriber {
  private static instance: WakuSubscriber;
  private activeDecoders = new Map<string, Decoder>();
  private wakuNode: LightNode | null = null;

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
  }

  public async subscribe(
    topicName: string,
    callback: (message: IDecodedMessage) => void,
  ): Promise<() => Promise<void>> {
    if (!this.wakuNode) {
      throw new Error('Waku node not available');
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
      if (this.wakuNode) {
        const decoder = this.activeDecoders.get(topicName);
        if (decoder) {
          await this.wakuNode.filter.unsubscribe([decoder]);
          this.activeDecoders.delete(topicName);
        }
      }
    };
  }

  public async destroy() {
    if (this.wakuNode) {
      const decoders = Array.from(this.activeDecoders.values());
      if (decoders.length > 0) {
        await this.wakuNode.filter.unsubscribe(decoders);
      }
      this.activeDecoders.clear();
    }
  }
}
