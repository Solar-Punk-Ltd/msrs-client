function getEnv(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const config = {
  readerBeeUrl: getEnv('VITE_READER_BEE_URL'),
  writerBeeUrl: getEnv('VITE_WRITER_BEE_URL'),
  stamp: getEnv('VITE_STAMP'),
  appOwner: getEnv('VITE_APP_OWNER'),
  rawAppTopic: getEnv('VITE_APP_RAW_TOPIC'),
  chatGsocResourceId: getEnv('VITE_CHAT_GSOC_RESOURCE_ID'),
  chatGsocTopic: getEnv('VITE_CHAT_GSOC_TOPIC'),
};
