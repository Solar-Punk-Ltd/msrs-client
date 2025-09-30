import { config } from './config';

export enum NodeType {
  MEDIA = 'media',
  CHAT = 'chat',
}

export interface NodeInfo {
  port: string;
  hash: string;
  locked: boolean;
  lock_info?: {
    locked_at: number;
    locked_by: string;
    instance: string;
    stream_id: string;
    type: NodeType;
    pinned: boolean;
  };
}

export interface StatusResponse {
  nodes: {
    private_writers: NodeInfo[];
    public_writers: NodeInfo[];
    readers: any[];
  };
  summary: {
    total_private_writers: number;
    locked_private_writers: number;
    pinned_private_writers: number;
    available_private_writers: number;
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
