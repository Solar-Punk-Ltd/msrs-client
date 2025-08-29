import { useMemo } from 'react';
import { FeedIndex, Topic } from '@ethersphere/bee-js';

import { InputLoading } from '@/components/InputLoading/InputLoading';
import { StreamThumbnail } from '@/components/StreamThumbnail/StreamThumbnail';
import { useAppContext } from '@/providers/App';
import { makeFeedIdentifier } from '@/utils/bee';
import { config } from '@/utils/config';

import './StreamList.scss';

const LAST_STREAMS_COUNT = -10;

export function StreamList() {
  const { streamList } = useAppContext();

  const manifestUrlMap = useMemo(() => {
    const map = new Map<string, string>();

    if (!streamList) return map;

    streamList.forEach((stream) => {
      const topic = Topic.fromString(stream.topic);
      const feedIndex = FeedIndex.fromBigInt(BigInt(0));
      const identifier = makeFeedIdentifier(topic, feedIndex);
      const manifestUrl = `${config.readerBeeUrl}/soc/${stream.owner}/${identifier.toHex()}`;
      map.set(stream.topic, manifestUrl);
    });

    return map;
  }, [streamList]);

  const displayedStreams = useMemo(() => {
    if (!streamList) return [];

    const lastTen = streamList.slice(LAST_STREAMS_COUNT);
    return [...lastTen].sort((a, b) => {
      // 1) Live streams at the top
      if (a.state === 'live' && b.state !== 'live') return -1;
      if (b.state === 'live' && a.state !== 'live') return 1;

      // 2) Precedence of timestamp (if available)
      const aHasTs = typeof a.timestamp === 'number';
      const bHasTs = typeof b.timestamp === 'number';
      if (aHasTs && bHasTs) {
        return b.timestamp! - a.timestamp!;
      }
      if (aHasTs) {
        return -1;
      }
      if (bHasTs) {
        return 1;
      }

      // 3) Index to sort for latest to oldest
      const aIndex = a.index ?? 0;
      const bIndex = b.index ?? 0;
      return bIndex - aIndex;
    });
  }, [streamList]);

  return (
    <div className="stream-list">
      {!streamList ? (
        <div className="stream-list-loading">
          <div className="stream-list-text">Loading streams...</div>
          <InputLoading />
        </div>
      ) : displayedStreams.length === 0 ? (
        <div className="stream-list-text">No streams available</div>
      ) : (
        <>
          <div className="stream-list-text">Choose a stream!</div>
          <div className="stream-thumbnail-list">
            {displayedStreams.map((stream) => (
              <StreamThumbnail
                key={stream.topic}
                manifestUrl={manifestUrlMap.get(stream.topic) || ''}
                owner={stream.owner}
                topic={stream.topic}
                state={stream.state}
                duration={stream.duration}
                mediatype={stream.mediatype}
                title={stream.title}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
