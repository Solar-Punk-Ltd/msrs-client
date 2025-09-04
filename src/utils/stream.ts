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

function createAuthData(privateKey: string) {
  const signer = new PrivateKey(privateKey);
  const nonce = crypto.randomUUID();
  const signature = signer.sign(nonce);

  return {
    nonce,
    signature: signature.toHex(),
    publicKey: config.appOwner,
  };
}

export async function fetchThumbnail(ref: string, { url = true }): Promise<Blob | string | null> {
  try {
    const response = await fetch(`${config.readerBeeUrl}/bzz/${ref}/`);

    if (!response.ok) {
      throw new Error(`Failed to fetch thumbnail: ${response.status}`);
    }

    const blob = await response.blob();

    if (!blob.type.startsWith('image/')) {
      throw new Error('Fetched content is not an image');
    }

    return url ? URL.createObjectURL(blob) : blob;
  } catch (error) {
    console.error('Error fetching thumbnail:', error);
    return null;
  }
}

export async function createStream(meta: StreamMetadata, privateKey: string) {
  const ref = meta.thumbnail ? await uploadThumbnail(meta.thumbnail as File) : '';
  const authData = createAuthData(privateKey);

  const message = JSON.stringify({
    ...authData,
    action: ActionType.CREATE,
    data: {
      owner: config.appOwner,
      topic: crypto.randomUUID(),
      title: meta.title,
      description: meta.description,
      state: StateType.SCHEDULED,
      mediaType: meta.mediaType,
      thumbnail: ref,
      scheduledStartTime: meta.scheduledStartTime ? meta.scheduledStartTime : null,
    },
  });

  await sendMessageToGsocOwn(message);
}

export async function deleteStream(privateKey: string, topic: string, owner: string) {
  const authData = createAuthData(privateKey);

  const message = JSON.stringify({
    ...authData,
    action: ActionType.DELETE,
    data: {
      owner,
      topic,
    },
  });

  await sendMessageToGsocOwn(message);
}

export async function updateStream(meta: StreamMetadata, privateKey: string, topic: string, owner: string) {
  let ref = '';
  if (meta.thumbnail) {
    if (meta.thumbnail instanceof File) {
      ref = await uploadThumbnail(meta.thumbnail);
    } else {
      ref = meta.thumbnail;
    }
  }

  const authData = createAuthData(privateKey);

  const message = JSON.stringify({
    ...authData,
    action: ActionType.UPDATE,
    data: {
      owner,
      topic,
      title: meta.title,
      description: meta.description,
      state: StateType.SCHEDULED,
      mediaType: meta.mediaType,
      thumbnail: ref,
      scheduledStartTime: meta.scheduledStartTime ? meta.scheduledStartTime : null,
    },
  });

  await sendMessageToGsocOwn(message);
}
