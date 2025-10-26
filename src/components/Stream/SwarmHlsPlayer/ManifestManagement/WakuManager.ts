import type { IDecodedMessage, LightNode } from '@solarpunkltd/waku-sdk';
import protobuf from 'protobufjs';

import { config } from '@/utils/shared/config';
import { WakuChannelManager } from '@/utils/waku/WakuChannelManager';

import type { ManifestUpdate, WakuMetadata } from './types';

const ManifestUpdateProtoBuf = new protobuf.Type('ManifestUpdate')
  .add(new protobuf.Field('streamId', 1, 'string'))
  .add(new protobuf.Field('sequence', 2, 'uint32'))
  .add(new protobuf.Field('manifest', 3, 'string'))
  .add(new protobuf.Field('isVod', 4, 'bool'));

export class WakuManager {
  constructor(private channelManager: WakuChannelManager) {}

  setNode(wakuNode: LightNode | null): void {
    this.channelManager.setNode(wakuNode);
  }

  isAvailable(): boolean {
    return config.isWakuEnabled;
  }

  async subscribe(metadata: WakuMetadata, onMessage: (message: IDecodedMessage) => void): Promise<() => Promise<void>> {
    if (!this.isAvailable()) {
      throw new Error('Waku is not available');
    }

    const streamId = metadata.wakuTopic.replace(/^hls-manifest-/, '');
    const channelName = `solarpunk-msrs-${streamId}-channel`;

    return this.channelManager.subscribe(channelName, metadata.wakuTopic, onMessage);
  }

  decodeManifestUpdate(payload: Uint8Array): ManifestUpdate {
    const decoded = ManifestUpdateProtoBuf.decode(payload);
    const object = ManifestUpdateProtoBuf.toObject(decoded, {
      longs: String,
      enums: String,
      bytes: String,
    });

    return {
      streamId: object.streamId,
      sequence: object.sequence,
      manifest: object.manifest,
      isVod: object.isVod || false,
    };
  }
}
