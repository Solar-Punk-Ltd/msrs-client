import { useNavigate, useParams } from 'react-router-dom';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { Chat } from '@/components/Chat/Chat';
import { SwarmHlsPlayer } from '@/components/SwarmHlsPlayer/SwarmHlsPlayer';
import { ROUTES } from '@/routes';

import './StreamWatcher.scss';

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

  if (!mediatype || !owner || !topic) {
    return <div>Invalid stream</div>;
  }

  return (
    <div className="stream-item-page">
      <Button variant={ButtonVariant.SECONDARY} onClick={() => handleBackButtonClick()} className="stream-back-button">
        ← Back
      </Button>

      <div className="stream-item-player">
        <SwarmHlsPlayer owner={owner} topic={topic} mediatype={mediatype} />
      </div>
      <div className="stream-item-chat">
        <Chat topic={topic} />
      </div>
    </div>
  );
}
