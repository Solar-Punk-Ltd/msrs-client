export enum MediaType {
  VIDEO = 'video',
  AUDIO = 'audio',
}

export const MEDIA_TYPE_LABELS = {
  [MediaType.VIDEO]: 'Video Stream',
  [MediaType.AUDIO]: 'Audio Only',
} as const;
