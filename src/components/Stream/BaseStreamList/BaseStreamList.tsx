import { useMemo } from 'react';
import { FeedIndex, Topic } from '@ethersphere/bee-js';

import { InputLoading } from '@/components/InputLoading/InputLoading';
import { useAppContext } from '@/providers/App';
import { StateType, Stream } from '@/types/stream';
import { makeFeedIdentifier } from '@/utils/bee';
import { config } from '@/utils/config';

import { StreamListItem } from '../StreamListItem/StreamListItem';

import './BaseStreamList.scss';

interface BaseStreamListProps {
  renderActions?: (stream: Stream) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  sortStreams?: (streams: Stream[]) => Stream[];
  title?: string;
  renderFooter?: () => React.ReactNode;
}

export function BaseStreamList({
  renderActions,
  className = '',
  itemClassName = '',
  sortStreams,
  title,
  renderFooter,
}: BaseStreamListProps) {
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

    if (sortStreams) {
      return sortStreams(streamList);
    }

    // Default sorting logic
    return streamList.sort((a, b) => {
      // 1) Live streams at the top
      if (a.state === StateType.LIVE && b.state !== StateType.LIVE) return -1;
      if (b.state === StateType.LIVE && a.state !== StateType.LIVE) return 1;

      // 2) Precedence of updatedAt
      const aHasTs = typeof a.updatedAt === 'number';
      const bHasTs = typeof b.updatedAt === 'number';
      if (aHasTs && bHasTs) {
        return b.updatedAt! - a.updatedAt!;
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
  }, [streamList, sortStreams]);

  if (!streamList) {
    return (
      <div className={className}>
        {title && <h2 className="base-stream-list-title">{title}</h2>}
        <div className="base-stream-list loading">
          <InputLoading />
        </div>
      </div>
    );
  }

  if (streamList.length === 0) {
    return (
      <div className={className}>
        {title && <h2 className="base-stream-list-title">{title}</h2>}
        <div className="base-stream-list empty">
          <p>No streams available</p>
        </div>
        {renderFooter && renderFooter()}
      </div>
    );
  }

  return (
    <div className={className}>
      {title && <h2 className="base-stream-list-title">{title}</h2>}
      <div className="base-stream-list">
        {displayedStreams.map((stream) => {
          const manifestUrl = manifestUrlMap.get(stream.topic) || '';
          return (
            <StreamListItem
              key={`${stream.owner}-${stream.topic}`}
              stream={stream}
              thumbnailRef={stream.thumbnail as string}
              manifestUrl={manifestUrl}
              renderActions={renderActions}
              className={itemClassName}
            />
          );
        })}
      </div>
      {renderFooter && renderFooter()}
    </div>
  );
}
