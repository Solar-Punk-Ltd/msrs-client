import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';

import { ConfirmationModal } from '@/components/ConfirmationModal/ConfirmationModal';
import { StreamManagerList } from '@/components/Stream';
import { useAppContext } from '@/providers/App';
import { useUserContext } from '@/providers/User';
import { Stream } from '@/types/stream';
import { deleteStream } from '@/utils/stream';

import './StreamManager.scss';

export function StreamManager() {
  const navigate = useNavigate();
  const { fetchAppState, setNewStreamList, refreshStreamList } = useAppContext();
  const { session } = useUserContext();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [streamToDelete, setStreamToDelete] = useState<Stream | null>(null);
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

  const handleEdit = (stream: Stream) => {
    navigate(`/edit/${stream.owner}/${stream.topic}`);
  };

  const handleDelete = (stream: Stream) => {
    setStreamToDelete(stream);
    setDeleteModalOpen(true);
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
      <StreamManagerList onEdit={handleEdit} onDelete={handleDelete} />

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
