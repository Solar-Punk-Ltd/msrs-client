import { Stream } from '@/types/stream';

import { BaseStreamList } from '../BaseStreamList/BaseStreamList';
import { StreamActionButton } from '../StreamActionButton/StreamActionButton';

import './StreamManagerList.scss';

interface StreamManagerListProps {
  onEdit: (stream: Stream) => void;
  onDelete: (stream: Stream) => void;
}

export function StreamManagerList({ onEdit, onDelete }: StreamManagerListProps) {
  const renderActions = (stream: Stream) => (
    <>
      <StreamActionButton
        onClick={() => onEdit(stream)}
        variant="edit"
        label="Edit stream"
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
        }
      />
      <StreamActionButton
        onClick={() => onDelete(stream)}
        variant="delete"
        label="Delete stream"
        icon={
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        }
      />
    </>
  );

  return (
    <BaseStreamList
      renderActions={renderActions}
      className="stream-manager-list"
      itemClassName="stream-manager-item"
      title="Stream Manager"
    />
  );
}
