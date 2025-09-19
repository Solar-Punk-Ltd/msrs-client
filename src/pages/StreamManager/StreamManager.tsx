import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';

import { ConfirmationModal } from '@/components/ConfirmationModal/ConfirmationModal';
import { StreamManagerList } from '@/components/Stream';
import { useAppContext } from '@/providers/App';
import { useUserContext } from '@/providers/User';
import { StateEntry } from '@/types/stream';
import { config } from '@/utils/config';
import { createMsrsIngestionToken } from '@/utils/login';
import { deleteStream, updateStreamPin } from '@/utils/stream';

import './StreamManager.scss';

export function StreamManager() {
  const navigate = useNavigate();
  const { fetchAppState, setNewStreamList, refreshStreamList } = useAppContext();
  const { session } = useUserContext();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [streamToDelete, setStreamToDelete] = useState<StateEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data } = useSWR('app-state', fetchAppState, {
    revalidateOnFocus: true,
    refreshInterval: 5000,
    dedupingInterval: 5000,
    shouldRetryOnError: true,
  });

  useEffect(() => {
    if (data) setNewStreamList(data);
  }, [data, setNewStreamList]);

  const handleEdit = (stream: StateEntry) => {
    navigate(`/edit/${stream.owner}/${stream.topic}`);
  };

  const handleDelete = (stream: StateEntry) => {
    setStreamToDelete(stream);
    setDeleteModalOpen(true);
  };

  const onPin = async (stream: StateEntry) => {
    if (!session) {
      console.error('User session not found. Please log in again.');
      return;
    }

    try {
      const newPinState = stream.pinned ? !stream.pinned : true;
      await updateStreamPin(session, stream.topic, stream.owner, newPinState);
      await refreshStreamList({ type: 'update', streamId: `${stream.owner}/${stream.topic}` });
    } catch (error) {
      console.error('Failed to update stream pin status:', error);
    }
  };

  const handleShowToken = async (stream: StateEntry) => {
    if (!session) {
      console.error('User session not found. Please log in again.');
      return;
    }

    const tokenMsg = {
      t: config.streamStateTopic,
      o: config.streamStateOwner,
      si: `${stream.owner}/${stream.topic}`,
      m: stream.mediaType,
    };

    const token = await createMsrsIngestionToken(session, tokenMsg);

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(token);
        alert(
          `MSRS Ingestion Token (copied to clipboard):\n\n${token}\n\nThe token has been automatically copied to your clipboard.`,
        );
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        alert(`MSRS Ingestion Token:\n\n${token}\n\nPlease manually copy this token.`);
      }
    } else {
      alert(`MSRS Ingestion Token:\n\n${token}\n\nPlease manually copy this token.`);
    }
  };

  const handleConfirmDelete = async () => {
    if (!streamToDelete) return;

    if (!session) {
      console.error('User session not found. Please log in again.');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteStream(session!, streamToDelete.topic, streamToDelete.owner);
      await refreshStreamList({ type: 'delete', streamId: `${streamToDelete.owner}/${streamToDelete.topic}` });
    } catch (error) {
      console.error('Failed to delete stream:', error);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setStreamToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setStreamToDelete(null);
  };

  return (
    <div className="stream-manager">
      <StreamManagerList onEdit={handleEdit} onDelete={handleDelete} onShowToken={handleShowToken} onPin={onPin} />

      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="Delete Stream"
        message={`Are you sure you want to delete "${streamToDelete?.title}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
      />
    </div>
  );
}
