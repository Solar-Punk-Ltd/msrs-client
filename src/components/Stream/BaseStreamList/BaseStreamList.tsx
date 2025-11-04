import { useMemo, useState } from 'react';
import { FeedIndex, Topic } from '@ethersphere/bee-js';

import { InputLoading } from '@/components/InputLoading/InputLoading';
import { useAppContext } from '@/providers/App/App';
import { StateEntry } from '@/types/stream';
import { makeFeedIdentifier } from '@/utils/network/bee';
import { config } from '@/utils/shared/config';

import { StreamListItem } from '../StreamListItem/StreamListItem';
import { StreamSearch } from '../StreamSearch/StreamSearch';

import './BaseStreamList.scss';

interface BaseStreamListProps {
  renderActions?: (stream: StateEntry) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  title?: string;
  renderHeader?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;
  enableSearch?: boolean;
}

export function BaseStreamList({
  renderActions,
  className = '',
  itemClassName = '',
  title,
  renderHeader,
  renderFooter,
  enableSearch = false,
}: BaseStreamListProps) {
  const { streamList, isLoading } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStreamList = useMemo(() => {
    if (!streamList || !searchQuery.trim()) {
      return streamList;
    }

    const query = searchQuery.toLowerCase().trim();

    return streamList.filter((stream) => {
      const titleMatch = stream.title?.toLowerCase().includes(query);
      const descriptionMatch = stream.description?.toLowerCase().includes(query);
      const tagsMatch = stream.tags?.some((tag) => tag.toLowerCase().includes(query));

      return titleMatch || descriptionMatch || tagsMatch;
    });
  }, [streamList, searchQuery]);

  const manifestUrlMap = useMemo(() => {
    const map = new Map<string, string>();

    if (!filteredStreamList) return map;

    filteredStreamList.forEach((stream) => {
      const topic = Topic.fromString(stream.topic);
      const feedIndex = FeedIndex.fromBigInt(BigInt(1));
      const identifier = makeFeedIdentifier(topic, feedIndex);
      const manifestUrl = `${config.readerBeeUrl}/soc/${stream.owner}/${identifier.toHex()}`;
      map.set(stream.topic, manifestUrl);
    });

    return map;
  }, [filteredStreamList]);

  const hasNoStreams = !isLoading && streamList?.length === 0;
  const hasNoResults = !isLoading && streamList && streamList.length > 0 && filteredStreamList?.length === 0;

  if (hasNoStreams) {
    return (
      <div className={className}>
        {renderHeader && renderHeader()}
        {title && <h2 className="base-stream-list-title">{title}</h2>}
        {enableSearch && <StreamSearch onSearch={setSearchQuery} />}
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
        {renderHeader && renderHeader()}
        {title && <h2 className="base-stream-list-title">{title}</h2>}
        {enableSearch && <StreamSearch onSearch={setSearchQuery} />}
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

      {renderHeader && renderHeader()}
      {title && <h2 className="base-stream-list-title">{title}</h2>}
      {enableSearch && <StreamSearch onSearch={setSearchQuery} />}

      <div className="base-stream-list-container">
        {hasNoResults ? (
          <div className="base-stream-list empty">
            <p>No streams found matching &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          <div className="base-stream-list">
            {filteredStreamList?.map((stream) => {
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
        )}
      </div>

      {renderFooter && renderFooter()}
    </div>
  );
}
