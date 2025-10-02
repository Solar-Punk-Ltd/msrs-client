import type { IDecodedMessage, LightNode } from '@waku/sdk';
import protobuf from 'protobufjs';

import { config } from '@/utils/config';
import { WakuSubscriber } from '@/utils/waku';

import type { ManifestUpdate, WakuMetadata } from './types';

const ManifestUpdateProtoBuf = new protobuf.Type('ManifestUpdate')
  .add(new protobuf.Field('streamId', 1, 'string'))
  .add(new protobuf.Field('sequence', 2, 'uint32'))
  .add(new protobuf.Field('manifest', 3, 'string'))
  .add(new protobuf.Field('isVod', 4, 'bool'));

export class WakuManager {
  private wakuSubscriber: WakuSubscriber | null = null;

  setNode(wakuNode: LightNode | null): void {
    if (wakuNode && config.isWakuEnabled) {
      if (!this.wakuSubscriber) {
        this.wakuSubscriber = new WakuSubscriber(wakuNode);
      }
    } else {
      this.wakuSubscriber = null;
    }
  }

  isAvailable(): boolean {
    return !!this.wakuSubscriber;
  }

  async subscribe(metadata: WakuMetadata, onMessage: (message: IDecodedMessage) => void): Promise<() => Promise<void>> {
    if (!this.wakuSubscriber) {
      throw new Error('Waku is not available');
    }

    return this.wakuSubscriber.subscribe(metadata.wakuTopic, onMessage);
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
