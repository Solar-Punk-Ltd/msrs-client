import { type StampWithInfo, type StreamGroup } from '@/hooks/useStamps';

export interface StampsData {
  pinnedStreams: StreamGroup[];
  privateStamps: StampWithInfo[];
  publicStamps: StampWithInfo[];
  customPrivateStamps: StampWithInfo[];
  isLoading: boolean;
  error: string | null;
  refresh: (stampId: string) => Promise<void>;
  refreshAll: () => void;
}
