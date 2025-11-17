import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ConfirmationModal } from '@/components/ConfirmationModal/ConfirmationModal';
import { SimpleModal } from '@/components/SimpleModal/SimpleModal';
import { StreamManagerList } from '@/components/Stream';
import { useAppContext } from '@/providers/App/App';
import { useUserContext } from '@/providers/User';
import { MessageReceiveMode } from '@/types/messaging';
import { StateEntry } from '@/types/stream';
import { createMsrsIngestionToken } from '@/utils/auth/login';
import { config } from '@/utils/shared/config';
import { deleteStream, updateStreamPin } from '@/utils/stream/stream';

import './StreamManager.scss';

export function StreamManager() {
  const navigate = useNavigate();
  const { session } = useUserContext();
  const { fetchAppState, setNewStreamList, refreshStreamList, isLoading, messageReceiveMode } = useAppContext();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [streamToDelete, setStreamToDelete] = useState<StateEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [displayToken, setDisplayToken] = useState<string>('');
  const [tokenCopiedToClipboard, setTokenCopiedToClipboard] = useState<boolean>(false);

  const { data } = useQuery({
    queryKey: ['app-state'],
    queryFn: fetchAppState,
    refetchInterval: 5000,
    retry: true,
    enabled: !isLoading,
    staleTime: 0,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (data) {
      setNewStreamList(data);
    }
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

    if (stream.isExternal === true) {
      console.error('Cannot pin external streams');
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
    setDisplayToken(token);

    let clipboardSuccess = false;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(token);
        clipboardSuccess = true;
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        clipboardSuccess = false;
      }
    }

    setTokenCopiedToClipboard(clipboardSuccess);
    setTokenModalOpen(true);
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

  const handleCloseTokenModal = () => {
    setTokenModalOpen(false);
    setDisplayToken('');
    setTokenCopiedToClipboard(false);
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

      <SimpleModal
        isOpen={tokenModalOpen}
        title="MSRS Ingestion Token"
        onClose={handleCloseTokenModal}
        closeText="Close"
      >
        <div className="simple-modal-subheader">
          {tokenCopiedToClipboard
            ? 'Token has been copied to your clipboard. Use this token for stream ingestion:'
            : 'Please manually copy this token for stream ingestion:'}
        </div>
        <div className="simple-modal-token">{displayToken}</div>
      </SimpleModal>
    </div>
  );
}
