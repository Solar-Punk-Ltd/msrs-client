import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';

import { StreamManagerList } from '@/components/Stream';
import { useAppContext } from '@/providers/App';
import { Stream } from '@/types/stream';

import './StreamManager.scss';

export function StreamManager() {
  const navigate = useNavigate();
  const { fetchAppState, setNewStreamList } = useAppContext();
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
    // TODO: Implement delete functionality
    console.log('Delete stream:', stream);
  };

  return (
    <div className="stream-manager">
      <StreamManagerList onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
}
