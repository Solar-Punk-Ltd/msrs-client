import { useNavigate, useParams } from 'react-router-dom';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { Chat } from '@/components/Chat/Chat';
import { SwarmHlsPlayer } from '@/components/SwarmHlsPlayer/SwarmHlsPlayer';
import { ROUTES } from '@/routes';

import './StreamWatcher.scss';

export enum MediaType {
  VIDEO = 'video',
  AUDIO = 'audio',
}

export const MEDIA_TYPE_LABELS = {
  [MediaType.VIDEO]: 'Video Stream',
  [MediaType.AUDIO]: 'Audio Only',
} as const;

export function StreamWatcher() {
  const { mediatype, owner, topic } = useParams<{
    mediatype: string;
    owner: string;
    topic: string;
  }>();
  const navigate = useNavigate();

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

      {(mediatype === MediaType.AUDIO || mediatype === MediaType.VIDEO) && (
        <div className="stream-item-player">
          <SwarmHlsPlayer owner={owner} topic={topic} mediaType={mediatype as MediaType} />
        </div>
      )}
      {!!mediatype && (
        <div className="stream-item-placeholder">
          <p>TODO</p>
        </div>
      )}
      <div className="stream-item-chat">
        <Chat topic={topic} />
      </div>
    </div>
  );
}
