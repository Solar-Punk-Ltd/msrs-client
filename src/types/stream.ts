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

export type StateEntry = {
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
  tags?: string[];
  scheduledStartTime?: string;
  isExternal?: boolean;
  pinned?: boolean;
};

export interface StateArrayWithTimestamp {
  entries: StateEntry[];
  lastModified: number;
}

export interface CreateMessage {
  action: ActionType.CREATE;
  data: StateEntry;
}

export interface UpdateMessage {
  action: ActionType.UPDATE;
  data: Partial<StateEntry>;
}

export interface DeleteMessage {
  action: ActionType.DELETE;
  data: Partial<StateEntry>;
}

export type StreamAggMessage = CreateMessage | UpdateMessage | DeleteMessage;

export interface MsrsIngMessage {
  t: string; // streamStateTopic
  o: string; // streamStateOwner
  si: string; // streamId
  m: MediaType; // mediaType
}
