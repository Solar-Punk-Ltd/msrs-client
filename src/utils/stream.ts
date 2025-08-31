import { Bee, Bytes, Identifier, PrivateKey } from '@ethersphere/bee-js';

import { StreamMetadata } from '@/pages/StreamForm/StreamForm';
import { ActionType, StateType } from '@/types/stream';

import { config } from './config';

const bee = new Bee(config.writerBeeUrl);
const gsocTopic = config.streamerGsocTopic;
const gsocResourceId = config.streamerGsocResourceId;
const stamp = config.stamp;

async function sendMessageToGsocOwn(message: string): Promise<void> {
  const signer = new PrivateKey(gsocResourceId);
  const identifier = Identifier.fromString(gsocTopic);

  const data = Bytes.fromUtf8(message);

  const { upload } = bee.makeSOCWriter(signer);

  await upload(stamp, identifier, data.toUint8Array());
}

async function uploadThumbnail(thumbnail: File): Promise<string> {
  const res = await bee.uploadFile(stamp, thumbnail);
  return res.reference.toHex();
}

export async function createStream(meta: StreamMetadata, privateKey: string) {
  const ref = meta.thumbnail ? await uploadThumbnail(meta.thumbnail) : '';

  // // good for now, later we will have proper auth
  const signer = new PrivateKey(privateKey);
  const nonce = crypto.randomUUID();
  const signature = signer.sign(nonce);

  const message = JSON.stringify({
    nonce,
    signature: signature.toHex(),
    action: ActionType.CREATE,
    publicKey: config.appOwner,
    data: {
      owner: config.appOwner,
      topic: crypto.randomUUID(),
      title: meta.title,
      description: meta.description,
      state: StateType.SCHEDULED,
      mediaType: meta.mediaType,
      thumbnail: ref,
      scheduledStartTime: meta.scheduledStartTime ? meta.scheduledStartTime.toISOString() : null,
    },
  });

  await sendMessageToGsocOwn(message);
}

export function deleteStream() {}

export async function updateStream(meta: StreamMetadata, privateKey: string, topic: string, owner: string) {
  const ref = meta.thumbnail ? await uploadThumbnail(meta.thumbnail) : '';

  // good for now, later we will have proper auth
  const signer = new PrivateKey(privateKey);
  const nonce = crypto.randomUUID();
  const signature = signer.sign(nonce);

  const message = JSON.stringify({
    nonce,
    signature: signature.toHex(),
    action: ActionType.UPDATE,
    publicKey: config.appOwner,
    data: {
      owner,
      topic,
      title: meta.title,
      description: meta.description,
      state: StateType.SCHEDULED,
      mediaType: meta.mediaType,
      thumbnail: ref,
      scheduledStartTime: meta.scheduledStartTime ? meta.scheduledStartTime.toISOString() : null,
    },
  });

  await sendMessageToGsocOwn(message);
}
