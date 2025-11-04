import { config } from '../shared/config';

export enum NodeType {
  MEDIA = 'media',
  CHAT = 'chat',
}

export interface StampInfo {
  stamp: string;
  state: string;
  lock_info?: {
    locked_at: number;
    locked_by: string;
    stream_id: string;
    type: NodeType;
    pinned: boolean;
  };
  history?: {
    stream_id: string;
    type: NodeType;
    unlocked_at: number;
    locked_at: number;
    locked_by: string;
    pinned: boolean;
  };
  tags?: string[];
}

export interface PrivateWriterNode {
  port: string;
  type: 'private';
  stamps: StampInfo[];
}

export interface CustomPrivateWriterNode {
  port: string;
  type: 'custom_private';
  stamps: StampInfo[];
}

export interface PublicWriterNode {
  port: string;
  type: 'public';
  stamp: string;
}

export interface ReaderNode {
  port: number;
  type: 'reader';
}

export interface StatusResponse {
  instance: string;
  timestamp: number;
  persistence: {
    exists: boolean;
    modified: number;
    path: string;
  };
  nodes: {
    private_writers: PrivateWriterNode[];
    custom_private_writers: CustomPrivateWriterNode[];
    public_writers: PublicWriterNode[];
    readers: ReaderNode[];
  };
  summary: {
    stamps: {
      total: number;
      locked: number;
      locked_pinned: number;
      history_unpinned: number;
      history_pinned: number;
      free: number;
    };
    total_public_writers: number;
    total_private_writers: number;
    total_custom_private_writers: number;
    total_readers: number;
  };
}

export interface NodeRequestOptions {
  adminSecret: string;
}

export const createNodeHeaders = (adminSecret: string): HeadersInit => ({
  'X-MSRS-Admin-Token': adminSecret,
  'Content-Type': 'application/json',
});

export const fetchFromGateway = async (path: string, options: NodeRequestOptions): Promise<Response> => {
  const { adminSecret } = options;

  const gatewayUrl = new URL(config.readerBeeUrl).origin;
  const fullUrl = `${gatewayUrl}${path}`;

  const response = await fetch(fullUrl, {
    headers: {
      ...createNodeHeaders(adminSecret),
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
};

export const fetchGatewayNodes = async (options: NodeRequestOptions): Promise<StatusResponse> => {
  const response = await fetchFromGateway('/admin/node/status', options);
  const status = (await response.json()) as StatusResponse;
  return status;
};
