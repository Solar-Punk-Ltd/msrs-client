import { type StampWithInfo, type StreamGroup } from '@/hooks/useStamps';
import { StampInfo } from '@/utils/network/stampInfo';

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

export function isStampActive(stampInfo: StampInfo): boolean {
  return stampInfo.isValid && stampInfo.financialStatus.isActive;
}
