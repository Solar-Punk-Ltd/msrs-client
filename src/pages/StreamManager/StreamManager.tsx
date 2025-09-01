import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';

import { StreamManagerList } from '@/components/Stream';
import { useAppContext } from '@/providers/App';
import { useUserContext } from '@/providers/User';
import { Stream } from '@/types/stream';
import { deleteStream } from '@/utils/stream';

import './StreamManager.scss';

export function StreamManager() {
  const navigate = useNavigate();
  const { fetchAppState, setNewStreamList } = useAppContext();
  const { keys } = useUserContext();
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

  const handleDelete = async (stream: Stream) => {
    try {
      await deleteStream(keys.private, stream.topic, stream.owner);
    } catch (error) {
      console.error('Failed to delete stream:', error);
    }
  };

  return (
    <div className="stream-manager">
      <StreamManagerList onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
