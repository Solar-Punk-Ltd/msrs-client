import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { Chat } from '@/components/Chat/Chat';
import { StreamPreview } from '@/components/StreamPreview/StreamPreview';
import { SwarmHlsPlayer } from '@/components/SwarmHlsPlayer/SwarmHlsPlayer';
import { useAppContext } from '@/providers/App';
import { ROUTES } from '@/routes';
import { MediaType, StateType } from '@/types/stream';

import './StreamWatcher.scss';

export function StreamWatcher() {
  const { mediatype, owner, topic, state } = useParams<{
    mediatype: string;
    owner: string;
    topic: string;
    state?: string;
  }>();
  const navigate = useNavigate();
  const { streamList } = useAppContext();

  const isScheduled = state === StateType.SCHEDULED;

  const foundStream = useMemo(() => {
    if (isScheduled && streamList && owner && topic) {
      return streamList.find(
        (stream) => stream.topic === topic && stream.owner === owner && stream.state === StateType.SCHEDULED,
      );
    }
    return null;
  }, [isScheduled, streamList, topic, owner]);

  const handleBackButtonClick = () => {
    navigate(ROUTES.STREAM_BROWSER);
  };

  if (!owner || !topic || (mediatype && !Object.values(MediaType).includes(mediatype as MediaType))) {
    return <div>Invalid stream</div>;
  }

  return (
    <div className="stream-item-page">
      <Button variant={ButtonVariant.SECONDARY} onClick={() => handleBackButtonClick()} className="stream-back-button">
        ← Back
      </Button>

      {!isScheduled && (mediatype === MediaType.AUDIO || mediatype === MediaType.VIDEO) && (
        <div className="stream-item-player">
          <SwarmHlsPlayer owner={owner} topic={topic} mediaType={mediatype as MediaType} />
        </div>
      )}

      {isScheduled && foundStream && (
        <StreamPreview
          title={foundStream.title}
          description={foundStream.description || 'No description available'}
          scheduledStartTime={foundStream.scheduledStartTime || ''}
        />
      )}

      {isScheduled && !foundStream && (
        <div className="stream-not-found">
          <h2>No streams found in this state</h2>
          <p>The scheduled stream you&apos;re looking for could not be found.</p>
        </div>
      )}

      <div className="stream-item-chat">
        <Chat topic={topic} />
      </div>
    </div>
  );
}
