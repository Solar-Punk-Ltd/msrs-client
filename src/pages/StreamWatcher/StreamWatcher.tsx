import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { Chat } from '@/components/Chat/Chat';
import { InputLoading } from '@/components/InputLoading/InputLoading';
import { ScheduledPlaceholder } from '@/components/Stream/ScheduledPlaceholder/ScheduledPlaceholder';
import { StreamInfo } from '@/components/Stream/StreamInfo/StreamInfo';
import { SwarmHlsPlayer } from '@/components/Stream/SwarmHlsPlayer/SwarmHlsPlayer';
import { useAppContext } from '@/providers/App/App';
import { useTheme } from '@/providers/Theme';
import { ROUTES } from '@/routes';
import { MessageReceiveMode } from '@/types/messaging';
import { MediaType, StateType } from '@/types/stream';
import { AVAILABLE_THEMES } from '@/utils/theme/themeConfig';

import './StreamWatcher.scss';

const SCHEDULED_STREAM_POLL_INTERVAL = 5000;

export function StreamWatcher() {
  const { mediatype, owner, topic } = useParams<{
    mediatype: string;
    owner: string;
    topic: string;
  }>();
  const navigate = useNavigate();
  const { streamList, isLoading, refreshStreamList, messageReceiveMode } = useAppContext();
  const { theme } = useTheme();
  const isWide = AVAILABLE_THEMES[theme].groupStreamsBySchedule ?? false;

  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  const foundStream = useMemo(() => {
    if (streamList && owner && topic) {
      return streamList.find((stream) => stream.topic === topic && stream.owner === owner);
    }
    return null;
  }, [streamList, topic, owner]);

  const isScheduled = foundStream?.state === StateType.SCHEDULED;

  useEffect(() => {
    if (isLoading) {
      setHasFetchedOnce(true);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isScheduled || messageReceiveMode !== MessageReceiveMode.SWARM) {
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;
    const abortController = new AbortController();

    const poll = async () => {
      if (!isMounted) return;

      await refreshStreamList(abortController.signal);

      if (isMounted) {
        timeoutId = setTimeout(poll, SCHEDULED_STREAM_POLL_INTERVAL);
      }
    };

    poll();

    return () => {
      isMounted = false;
      abortController.abort();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isScheduled, refreshStreamList, messageReceiveMode]);

  const shouldShowLoading = isLoading && streamList.length === 0;
  const shouldShowError = !isLoading && hasFetchedOnce && !foundStream;

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
    <div className={`stream-item-page ${isWide ? 'stream-item-page--wide' : ''}`}>
      <Button variant={ButtonVariant.SECONDARY} onClick={() => handleBackButtonClick()} className="stream-back-button">
        ← Back
      </Button>

      {foundStream && isScheduled && isWide && (
        <div className="stream-item-player">
          <ScheduledPlaceholder
            title={foundStream.title}
            thumbnailRef={foundStream.thumbnail as string}
            owner={owner}
            topic={topic}
            mediaType={(mediatype as MediaType) || foundStream.mediaType}
            scheduledStartTime={foundStream.scheduledStartTime}
          />
        </div>
      )}

      {foundStream && !isScheduled && (mediatype === MediaType.AUDIO || mediatype === MediaType.VIDEO) && (
        <div className="stream-item-player">
          <SwarmHlsPlayer
            owner={owner}
            topic={topic}
            mediaType={mediatype as MediaType}
            streamState={foundStream.state}
            isExternal={foundStream.isExternal}
            manifestIndex={foundStream.index}
          />
        </div>
      )}

      {foundStream && isWide ? (
        <div className="stream-watch-info">
          <h1 className="stream-watch-title">{foundStream.title}</h1>
          {foundStream.description && <p className="stream-watch-description">{foundStream.description}</p>}
        </div>
      ) : (
        foundStream && (
          <StreamInfo
            title={foundStream.title}
            description={foundStream.description || 'No description available'}
            tags={foundStream.tags}
            scheduledStartTime={foundStream.scheduledStartTime}
            isScheduled={isScheduled}
            onExpandChange={setIsInfoExpanded}
          />
        )
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

      {!shouldShowError && (
        <div className={`stream-item-chat ${isInfoExpanded ? 'hidden' : ''}`}>
          <Chat owner={owner} topic={topic} isExternal={foundStream?.isExternal} />
        </div>
      )}
    </div>
  );
}
