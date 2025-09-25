import { ethers } from 'ethers';

import { StreamGroup } from '@/hooks/useStamps';

import { StreamStampCard } from './StreamStampCard';

import './PinnedStampGrid.scss';

interface PinnedStreamGridProps {
  streams: StreamGroup[];
  signer: ethers.Signer | null;
}

export function PinnedStreamGrid({ streams, signer }: PinnedStreamGridProps) {
  return (
    <div className="pinned-streams-section">
      <h2 className="pinned-streams-title">Pinned Streams</h2>
      <div className="pinned-streams-grid">
        {streams.map((stream) => (
          <div key={stream.streamId} className="stream-group">
            <div className="stream-group-header">
              <span className="stream-id-label">Stream ID:</span>
              <span className="stream-id-value">{stream.streamId}</span>
            </div>
            <div className="stream-stamps">
              {stream.stamps.map((stamp) => (
                <StreamStampCard key={stamp.stampId} stamp={stamp} signer={signer || undefined} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
