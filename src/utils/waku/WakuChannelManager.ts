import { type LightNode, ReliableChannel } from '@solarpunkltd/waku-sdk';
import crypto from 'crypto';

interface ChannelSubscription {
  channel: ReliableChannel<any>;
  handler: (message: any) => void;
  contentTopic: string;
  channelName: string;
  topicName: string;
  messageListener: (event: any) => void;
  missingListener?: (event: any) => void;
}

export class WakuChannelManager {
  private currentNode: LightNode | null = null;

  private readonly senderId = crypto.randomBytes(8).toString('hex');
  private channelSubscriptions = new Map<string, ChannelSubscription>();

  constructor() {}

  public setNode(node: LightNode | null): void {
    this.currentNode = node;
  }

  public async subscribe(
    channelName: string,
    topicName: string,
    callback: (message: any) => void,
  ): Promise<() => Promise<void>> {
    if (this.channelSubscriptions.has(channelName)) {
      return async () => this.unsubscribeChannel(channelName);
    }

    if (!this.currentNode) {
      throw new Error('Waku node not available');
    }

    await this.createChannelSubscription(this.currentNode, channelName, topicName, callback);

    return async () => this.unsubscribeChannel(channelName);
  }

  private async createChannelSubscription(
    node: LightNode,
    channelName: string,
    topicName: string,
    callback: (message: any) => void,
  ): Promise<void> {
    const contentTopic = `/solarpunk-msrs/1/${topicName}/proto`;

    const encoder = node.createEncoder({ contentTopic });
    const decoder = node.createDecoder({ contentTopic });

    const reliableChannel = await ReliableChannel.create(node, channelName, this.senderId, encoder, decoder, {
      retrieveFrequencyMs: 3000,
      queryOnConnect: false,
    });

    const messageListener = (event: any) => {
      const wakuMessage = event.detail;

      if (!wakuMessage.payload) return;

      const message = {
        payload: wakuMessage.payload,
        timestamp: Date.now(),
        contentTopic,
      };

      try {
        callback(message);
      } catch (error) {
        // Handle error silently
      }
    };

    reliableChannel.addEventListener('message-received', messageListener);

    // TODO: Implement missing message handling if needed - WIP
    let missingListener: ((event: any) => void) | undefined;
    // if (reliableChannel.messageChannel) {
    //   missingListener = (event: any) => {
    //     const wakuMessage = event.detail;
    //     const message = {
    //       payload: wakuMessage.payload,
    //       timestamp: Date.now(),
    //       contentTopic,
    //     };

    //     console.log('[WakuChannelManager] Received missing message via SDS', message);
    //     // callback(message);
    //   };
    //   reliableChannel.messageChannel.addEventListener('sds:in:message-missing' as any, missingListener);
    // }

    const subscription: ChannelSubscription = {
      channel: reliableChannel,
      handler: callback,
      contentTopic,
      channelName,
      topicName,
      messageListener,
      missingListener,
    };

    this.channelSubscriptions.set(channelName, subscription);
  }

  private async unsubscribeChannel(channelName: string): Promise<void> {
    const subscription = this.channelSubscriptions.get(channelName);
    if (!subscription) return;

    try {
      subscription.channel.removeEventListener('message-received', subscription.messageListener);

      // if (subscription.missingListener && subscription.channel.messageChannel) {
      //   subscription.channel.messageChannel.removeEventListener(
      //     'sds:in:message-missing' as any,
      //     subscription.missingListener,
      //   );
      // }

      await subscription.channel.stop();

      this.channelSubscriptions.delete(channelName);
    } catch (error) {
      this.channelSubscriptions.delete(channelName);
    }
  }

  private async clearAllSubscriptions(): Promise<void> {
    const unsubscribePromises = Array.from(this.channelSubscriptions.keys()).map((channelName) =>
      this.unsubscribeChannel(channelName),
    );

    await Promise.allSettled(unsubscribePromises);
    this.channelSubscriptions.clear();
  }

  public async destroy(): Promise<void> {
    await this.clearAllSubscriptions();
  }
}
