import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { Chat } from '@/components/Chat/Chat';
import { InputLoading } from '@/components/InputLoading/InputLoading';
import { StreamInfo } from '@/components/Stream/StreamInfo/StreamInfo';
import { SwarmHlsPlayer } from '@/components/SwarmHlsPlayer/SwarmHlsPlayer';
import { useAppContext } from '@/providers/App';
import { ROUTES } from '@/routes';
import { MediaType, StateType } from '@/types/stream';

import './StreamWatcher.scss';

export function StreamWatcher() {
  const { mediatype, owner, topic } = useParams<{
    mediatype: string;
    owner: string;
    topic: string;
  }>();
  const navigate = useNavigate();
  const { streamList, isLoading } = useAppContext();

  const foundStream = useMemo(() => {
    if (streamList && owner && topic) {
      return streamList.find((stream) => stream.topic === topic && stream.owner === owner);
    }
    return null;
  }, [streamList, topic, owner]);

  const isScheduled = foundStream?.state === StateType.SCHEDULED;

  const shouldShowLoading = isLoading || streamList.length === 0;
  const shouldShowError = !shouldShowLoading && !foundStream;

  const handleBackButtonClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(ROUTES.STREAM_BROWSER);
    }
  };

  if (!owner || !topic || (mediatype && !Object.values(MediaType).includes(mediatype as MediaType))) {
    return <div>Invalid stream</div>;
  }

  return (
    <div className="stream-item-page">
      <Button variant={ButtonVariant.SECONDARY} onClick={() => handleBackButtonClick()} className="stream-back-button">
        ← Back
      </Button>

      {foundStream && !isScheduled && (mediatype === MediaType.AUDIO || mediatype === MediaType.VIDEO) && (
        <div className="stream-item-player">
          <SwarmHlsPlayer owner={owner} topic={topic} mediaType={mediatype as MediaType} />
        </div>
      )}

      {foundStream && (
        <StreamInfo
          title={foundStream.title}
          description={foundStream.description || 'No description available'}
          scheduledStartTime={foundStream.scheduledStartTime}
          isScheduled={isScheduled}
        />
      )}

      {shouldShowLoading && (
        <div className="stream-loading">
          <InputLoading />
          <h2>Searching for the stream...</h2>
        </div>
      )}

      {shouldShowError && (
        <div className="stream-not-found">
          <h2>Something went wrong!</h2>
          <p>The stream you&apos;re looking for could not be found.</p>
        </div>
      )}

      <div className="stream-item-chat">
        <Chat owner={owner} topic={topic} />
      </div>
    </div>
  );
}
