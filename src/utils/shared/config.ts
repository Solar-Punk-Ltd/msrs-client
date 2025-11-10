import { MessageReceiveMode } from '@/types/messaging';

type RuntimeConfig = {
  VITE_THEME: string;
  VITE_READER_BEE_URL: string;
  VITE_WRITER_BEE_URL: string;
  VITE_STAMP: string;
  VITE_STREAM_STATE_OWNER: string;
  VITE_STREAM_STATE_TOPIC: string;
  VITE_CHAT_GSOC_RESOURCE_ID: string;
  VITE_CHAT_GSOC_TOPIC: string;
  VITE_STREAMER_GSOC_RESOURCE_ID: string;
  VITE_STREAMER_GSOC_TOPIC: string;
  VITE_MESSAGE_RECEIVE_MODE: string;
  VITE_WAKU_STATIC_PEER: string;
  VITE_REGISTER_TOPIC: string;
};

function getEnv(name: string): string {
  if (typeof window !== 'undefined') {
    const config = (window as any).__CONFIG__ as RuntimeConfig | undefined;
    if (config) {
      const value = config[name as keyof RuntimeConfig];
      if (value) return value;
      throw new Error(`Missing env var in runtime config: ${name}`);
    }
  }

  // Fallback to build-time env (for local dev)
  const value = import.meta.env[name as keyof ImportMetaEnv];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function getMessageReceiveModeEnv(name: string, defaultValue: MessageReceiveMode): MessageReceiveMode {
  try {
    const value = getEnv(name).toLowerCase().trim();
    if (value === MessageReceiveMode.SWARM) return MessageReceiveMode.SWARM;
    if (value === MessageReceiveMode.WAKU) return MessageReceiveMode.WAKU;
    if (value === MessageReceiveMode.BOTH) return MessageReceiveMode.BOTH;
    console.warn(`Invalid MESSAGE_RECEIVE_MODE value: ${value}, using default: ${defaultValue}`);
    return defaultValue;
  } catch {
    return defaultValue;
  }
}

export function getTheme(): string {
  try {
    return getEnv('VITE_THEME');
  } catch {
    return 'cryptomondays';
  }
}

export const config = {
  readerBeeUrl: getEnv('VITE_READER_BEE_URL'),
  writerBeeUrl: getEnv('VITE_WRITER_BEE_URL'),
  stamp: getEnv('VITE_STAMP'),
  streamStateOwner: getEnv('VITE_STREAM_STATE_OWNER'),
  streamStateTopic: getEnv('VITE_STREAM_STATE_TOPIC'),
  chatGsocResourceId: getEnv('VITE_CHAT_GSOC_RESOURCE_ID'),
  chatGsocTopic: getEnv('VITE_CHAT_GSOC_TOPIC'),
  streamerGsocResourceId: getEnv('VITE_STREAMER_GSOC_RESOURCE_ID'),
  streamerGsocTopic: getEnv('VITE_STREAMER_GSOC_TOPIC'),
  messageReceiveMode: getMessageReceiveModeEnv('VITE_MESSAGE_RECEIVE_MODE', MessageReceiveMode.WAKU),
  wakuStaticPeer: getEnv('VITE_WAKU_STATIC_PEER'),
  registerTopic: getEnv('VITE_REGISTER_TOPIC'),
};
