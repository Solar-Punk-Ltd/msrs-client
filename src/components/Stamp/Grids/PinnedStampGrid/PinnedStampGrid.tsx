import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';

import { PortalTooltip } from '@/components/PortalTooltip/PortalTooltip';
import { StreamGroup } from '@/hooks/useStamps';
import { useAppContext } from '@/providers/App/App';
import { StateEntry } from '@/types/stream';

import { StreamStampCard } from '../../Cards/StreamStampCard/StreamStampCard';

import './PinnedStampGrid.scss';

interface PinnedStreamGridProps {
  streams: StreamGroup[];
  signer: ethers.Signer | null;
  onStampRefresh?: (stampId: string) => Promise<void>;
}

interface StreamInfo {
  streamId: string;
  owner: string;
  topic: string;
  matchedStream?: StateEntry;
}

export function PinnedStreamGrid({ streams, signer, onStampRefresh }: PinnedStreamGridProps) {
  const { streamList } = useAppContext();
  const navigate = useNavigate();
  const [expandedStreams, setExpandedStreams] = useState<Record<string, boolean>>({});

  // Parse stream IDs and match with streamList
  const streamInfoMap = useMemo(() => {
    const map = new Map<string, StreamInfo>();

    streams.forEach((stream) => {
      // Parse the streamId which is in "owner/topic" format
      const [owner, ...topicParts] = stream.streamId.split('/');
      const topic = topicParts.join('/'); // Handle topics that might contain '/'

      const normalizedOwner = owner.toLowerCase();
      const normalizedTopic = topic.toLowerCase();

      const matchedStream = streamList.find(
        (s) => s.owner.toLowerCase() === normalizedOwner && s.topic.toLowerCase() === normalizedTopic,
      );

      map.set(stream.streamId, {
        streamId: stream.streamId,
        owner: normalizedOwner,
        topic: normalizedTopic,
        matchedStream,
      });
    });

    return map;
  }, [streams, streamList]);

  const handleToggleExpanded = (streamId: string) => {
    setExpandedStreams((prev) => ({
      ...prev,
      [streamId]: !prev[streamId],
    }));
  };

  const handleWatchStream = (streamInfo: StreamInfo) => {
    if (streamInfo.matchedStream) {
      const { mediaType, owner, topic } = streamInfo.matchedStream;
      navigate(`/watch/${mediaType}/${owner}/${topic}`);
    }
  };

  return (
    <div className="pinned-streams-section">
      <h2 className="pinned-streams-title">Pinned Stamps</h2>
      <div className="pinned-streams-grid">
        {streams.map((stream) => {
          const isExpanded = expandedStreams[stream.streamId] || false;
          const streamInfo = streamInfoMap.get(stream.streamId);
          const hasMatchedStream = streamInfo?.matchedStream;

          return (
            <div key={stream.streamId} className="stream-group">
              <div className="stream-group-header">
                <div className="stream-info">
                  <div className="stream-id-row">
                    <span className="stream-id-label">Stream ID:</span>
                    <PortalTooltip
                      content={stream.streamId}
                      position="auto"
                      maxWidth={400}
                      className="stream-value-wrapper"
                    >
                      <span className="stream-id-value">{stream.streamId}</span>
                    </PortalTooltip>
                  </div>

                  {hasMatchedStream && (
                    <div className="stream-title-row">
                      <span className="stream-title-label">Title:</span>
                      <PortalTooltip
                        content={streamInfo.matchedStream!.title}
                        position="auto"
                        maxWidth={400}
                        className="stream-value-wrapper"
                      >
                        <span className="stream-title-value">{streamInfo.matchedStream!.title}</span>
                      </PortalTooltip>
                    </div>
                  )}
                </div>

                {hasMatchedStream && (
                  <button
                    className="stream-watch-button"
                    onClick={() => handleWatchStream(streamInfo!)}
                    aria-label={`Watch ${streamInfo.matchedStream!.title}`}
                    title={`Watch ${streamInfo.matchedStream!.title}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>Watch</span>
                  </button>
                )}
              </div>

              <div className="stream-stamps">
                {stream.stamps.map((stamp) => (
                  <StreamStampCard
                    key={stamp.stampId}
                    stamp={stamp}
                    signer={signer || undefined}
                    sharedExpanded={isExpanded}
                    onToggleExpanded={() => handleToggleExpanded(stream.streamId)}
                    onStampRefresh={onStampRefresh}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
