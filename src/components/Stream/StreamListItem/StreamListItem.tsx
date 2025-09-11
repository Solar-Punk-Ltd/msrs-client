import { StateEntry } from '@/types/stream';

import { StreamThumbnail } from '../StreamThumbnail/StreamThumbnail';

import './StreamListItem.scss';

interface StreamListItemProps {
  stream: StateEntry;
  thumbnailRef?: string;
  manifestUrl: string;
  renderActions?: (stream: StateEntry) => React.ReactNode;
  className?: string;
}

export function StreamListItem({
  stream,
  thumbnailRef,
  manifestUrl,
  renderActions,
  className = '',
}: StreamListItemProps) {
  return (
    <div className={`stream-list-item ${className}`}>
      <StreamThumbnail
        title={stream.title}
        thumbnailRef={thumbnailRef}
        manifestUrl={manifestUrl}
        owner={stream.owner}
        topic={stream.topic}
        state={stream.state}
        duration={stream.duration}
        mediaType={stream.mediaType}
      />
      {renderActions && <div className="stream-list-item-actions">{renderActions(stream)}</div>}
    </div>
  );
}
