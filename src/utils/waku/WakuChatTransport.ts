import { MessageData, MessageTransport } from '@solarpunkltd/swarm-chat-js';
import protobuf from 'protobufjs';

import { WakuChannelManager } from './WakuChannelManager';

export interface WakuTransportConfig {
  channelManager: WakuChannelManager;
  chatTopic: string;
}

export class WakuTransport implements MessageTransport {
  private messagePayloadType: protobuf.Type | null = null;
  private messageCallback: ((message: MessageData) => void) | null = null;
  private unsubscribe: (() => Promise<void>) | null = null;
  private isStarted = false;
  private isStopping = false;

  constructor(private config: WakuTransportConfig) {}

  onMessage(callback: (message: MessageData) => void): void {
    this.messageCallback = callback;
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      console.warn('[WakuTransport] Already started');
      return;
    }

    if (this.isStopping) {
      throw new Error('Transport is stopping');
    }

    this.isStarted = true;
    this.createProtobufSchema();

    try {
      await this.subscribeToChannel();
      console.log('[WakuTransport] Waku transport started');
    } catch (error) {
      this.isStarted = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isStarted || this.isStopping) {
      return;
    }

    this.isStopping = true;
    this.isStarted = false;
    this.messageCallback = null;

    if (this.unsubscribe) {
      try {
        await this.unsubscribe();
      } catch (err) {
        console.error('[WakuTransport] Error during unsubscribe:', err);
      }
      this.unsubscribe = null;
    }

    this.isStopping = false;
    console.log('[WakuTransport] Waku transport stopped');
  }

  private createProtobufSchema(): void {
    const MessageDataType = new protobuf.Type('MessageData')
      .add(new protobuf.Field('id', 1, 'string'))
      .add(new protobuf.Field('targetMessageId', 2, 'string', 'optional'))
      .add(new protobuf.Field('type', 3, 'string'))
      .add(new protobuf.Field('message', 4, 'string'))
      .add(new protobuf.Field('username', 5, 'string'))
      .add(new protobuf.Field('address', 6, 'string'))
      .add(new protobuf.Field('timestamp', 7, 'uint64'))
      .add(new protobuf.Field('signature', 8, 'string'))
      .add(new protobuf.Field('index', 9, 'uint32'))
      .add(new protobuf.Field('chatTopic', 10, 'string'))
      .add(new protobuf.Field('userTopic', 11, 'string'))
      .add(new protobuf.Field('additionalProps', 12, 'string', 'optional'));

    const MessageStateRefType = new protobuf.Type('MessageStateRef')
      .add(new protobuf.Field('reference', 1, 'string'))
      .add(new protobuf.Field('timestamp', 2, 'uint64'));

    this.messagePayloadType = new protobuf.Type('MessagePayload')
      .add(MessageDataType)
      .add(MessageStateRefType)
      .add(new protobuf.Field('message', 1, 'MessageData'))
      .add(new protobuf.Field('messageStateRefs', 2, 'MessageStateRef', 'repeated'));

    console.log('[WakuTransport] Protobuf schema created for Waku transport');
  }

  private async subscribeToChannel(): Promise<void> {
    if (this.isStopping) {
      throw new Error('Transport is stopping');
    }

    const { channelManager, chatTopic } = this.config;
    const channelName = `chat-channel-${chatTopic}`;

    this.unsubscribe = await channelManager.subscribe(channelName, chatTopic, (message) => {
      if (!this.isStopping && this.isStarted) {
        this.handleMessage(message);
      }
    });

    console.log(`[WakuTransport] Subscribed to Waku channel for topic: ${chatTopic}`);
  }

  private handleMessage = (message: { payload: Uint8Array; timestamp: number; contentTopic: string }): void => {
    if (!this.isStarted || this.isStopping || !this.messageCallback) {
      return;
    }

    try {
      if (!message.payload) {
        console.warn('[WakuTransport] Received Waku message without payload');
        return;
      }

      if (!this.messagePayloadType) {
        throw new Error('Protobuf schema not initialized');
      }

      const decoded = this.messagePayloadType.decode(message.payload);
      const decodedObject = this.messagePayloadType.toObject(decoded, {
        longs: String,
        enums: String,
        defaults: true,
      });

      if (!decodedObject.message) {
        console.warn('[WakuTransport] Decoded object has no message field');
        return;
      }

      // Parse additionalProps if it's a JSON string
      let additionalProps = decodedObject.message.additionalProps;
      if (additionalProps && typeof additionalProps === 'string') {
        try {
          additionalProps = JSON.parse(additionalProps);
        } catch (e) {
          console.warn('[WakuTransport] Failed to parse additionalProps as JSON:', additionalProps);
        }
      }

      const messageData: MessageData = {
        ...decodedObject.message,
        timestamp: Number(decodedObject.message.timestamp),
        additionalProps,
      };

      if (!messageData?.id) {
        console.warn('[WakuTransport] Received invalid message structure via Waku');
        return;
      }

      if (this.messageCallback && this.isStarted && !this.isStopping) {
        this.messageCallback(messageData);
      }
    } catch (error) {
      console.error('[WakuTransport] Error handling Waku message:', error);
    }
  };
}
