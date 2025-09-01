export enum MediaType {
  VIDEO = 'video',
  AUDIO = 'audio',
}

export const MEDIA_TYPE_LABELS = {
  [MediaType.VIDEO]: 'Video Stream',
  [MediaType.AUDIO]: 'Audio Only',
} as const;

export enum ActionType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export enum StateType {
  LIVE = 'live',
  VOD = 'vod',
  SCHEDULED = 'scheduled',
}

export type Stream = {
  title: string;
  state: StateType;
  owner: string;
  topic: string;
  mediaType: MediaType;
  createdAt: number;
  updatedAt: number;
  index?: number;
  duration?: number;
  thumbnail?: string | File;
  description?: string;
  scheduledStartTime?: string;
};
