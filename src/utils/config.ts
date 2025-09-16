type RuntimeConfig = {
  VITE_READER_BEE_URL: string;
  VITE_WRITER_BEE_URL: string;
  VITE_STAMP: string;
  VITE_STREAM_STATE_OWNER: string;
  VITE_STREAM_STATE_TOPIC: string;
  VITE_CHAT_GSOC_RESOURCE_ID: string;
  VITE_CHAT_GSOC_TOPIC: string;
  VITE_STREAMER_GSOC_RESOURCE_ID: string;
  VITE_STREAMER_GSOC_TOPIC: string;
};

function getEnv(name: string): string {
  // First check runtime config - workaround for easy env injection in docker setups
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
};
