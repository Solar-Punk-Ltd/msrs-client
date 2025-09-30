import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/routes';
import { StateEntry, StateType } from '@/types/stream';

import { BaseStreamList } from '../BaseStreamList/BaseStreamList';
import { StreamActionButton } from '../StreamActionButton/StreamActionButton';

import './StreamManagerList.scss';

interface StreamManagerListProps {
  onEdit: (stream: StateEntry) => void;
  onDelete: (stream: StateEntry) => void;
  onShowToken: (stream: StateEntry) => Promise<void>;
  onPin: (stream: StateEntry) => Promise<void>;
}

export function StreamManagerList({ onEdit, onDelete, onShowToken, onPin }: StreamManagerListProps) {
  const navigate = useNavigate();

  const renderActions = (stream: StateEntry) => (
    <>
      {stream.state === StateType.SCHEDULED && (
        <StreamActionButton
          onClick={() => onShowToken(stream)}
          variant="token"
          label="Show token"
          icon={
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
            </svg>
          }
        />
      )}
      {(stream.state === StateType.LIVE || stream.state === StateType.VOD) && (
        <StreamActionButton
          onClick={() => onPin(stream)}
          variant={stream.pinned ? 'unpin' : 'pin'}
          label={stream.pinned ? 'Unpin stream' : 'Pin stream'}
          icon={
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.2V22H12.8V16H18V14L16,12Z" />
            </svg>
          }
        />
      )}
      {stream.state === StateType.SCHEDULED && (
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
      )}
      {(stream.state === StateType.SCHEDULED || stream.state === StateType.VOD) && (
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
      )}
    </>
  );

  const renderFooter = useCallback(
    () => (
      <div className="stream-manager-footer">
        <button className="create-stream-button" onClick={() => navigate(ROUTES.STREAM_CREATE)}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="create-icon">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Create New Stream
        </button>
      </div>
    ),
    [navigate],
  );

  return (
    <BaseStreamList
      renderActions={renderActions}
      className="stream-manager-list"
      itemClassName="stream-manager-item"
      title="Stream Manager"
      renderFooter={renderFooter}
    />
  );
}
