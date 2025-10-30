import { useMemo } from 'react';
import { FeedIndex, Topic } from '@ethersphere/bee-js';

import { InputLoading } from '@/components/InputLoading/InputLoading';
import { useAppContext } from '@/providers/App/App';
import { StateEntry } from '@/types/stream';
import { makeFeedIdentifier } from '@/utils/network/bee';
import { config } from '@/utils/shared/config';

import { StreamListItem } from '../StreamListItem/StreamListItem';

import './BaseStreamList.scss';

interface BaseStreamListProps {
  renderActions?: (stream: StateEntry) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  title?: string;
  renderFooter?: () => React.ReactNode;
}

export function BaseStreamList({
  renderActions,
  className = '',
  itemClassName = '',
  title,
  renderFooter,
}: BaseStreamListProps) {
  const { streamList, isLoading } = useAppContext();

  const manifestUrlMap = useMemo(() => {
    const map = new Map<string, string>();

    if (!streamList) return map;

    streamList.forEach((stream) => {
      const topic = Topic.fromString(stream.topic);
      const feedIndex = FeedIndex.fromBigInt(BigInt(1));
      const identifier = makeFeedIdentifier(topic, feedIndex);
      const manifestUrl = `${config.readerBeeUrl}/soc/${stream.owner}/${identifier.toHex()}`;
      map.set(stream.topic, manifestUrl);
    });

    return map;
  }, [streamList]);

  if (!isLoading && streamList?.length === 0) {
    return (
      <div className={className}>
        {title && <h2 className="base-stream-list-title">{title}</h2>}
        <div className="base-stream-list-container">
          <div className="base-stream-list empty">
            <p>No streams available</p>
          </div>
        </div>
        {renderFooter && renderFooter()}
      </div>
    );
  }

  if (isLoading && (!streamList || streamList.length === 0)) {
    return (
      <div className={className}>
        {title && <h2 className="base-stream-list-title">{title}</h2>}
        <div className="base-stream-list-container">
          <div className="base-stream-list loading">
            <InputLoading />
          </div>
        </div>
        {renderFooter && renderFooter()}
      </div>
    );
  }

  return (
    <div className={`${className} ${isLoading ? 'loading-overlay' : ''}`}>
      {isLoading && (
        <div className="base-stream-list-loading-overlay">
          <InputLoading />
        </div>
      )}

      {title && <h2 className="base-stream-list-title">{title}</h2>}
      <div className="base-stream-list-container">
        <div className="base-stream-list">
          {streamList.map((stream) => {
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
      </div>

      {renderFooter && renderFooter()}
    </div>
  );
}
