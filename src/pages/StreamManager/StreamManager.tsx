import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

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
  const { session } = useUserContext();
  const { fetchAppState, setNewStreamList, refreshStreamList, isLoading } = useAppContext();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [streamToDelete, setStreamToDelete] = useState<StateEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data } = useQuery({
    queryKey: ['app-state'],
    queryFn: () => fetchAppState(),
    refetchInterval: 2500,
    retry: true,
    enabled: !isLoading,
    staleTime: 0,
    gcTime: Infinity,
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
      await refreshStreamList();
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
      await refreshStreamList();
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
