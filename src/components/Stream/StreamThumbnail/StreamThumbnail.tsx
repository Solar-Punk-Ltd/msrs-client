import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { MediaType, StateType } from '@/types/stream';
import { formatDuration } from '@/utils/ui/format';

import { thumbnailCache } from './thumbnailCache';

import './StreamThumbnail.scss';

const PlayIcon = '/assets/icons/playIcon.png';
const AudioStreamImage = '/assets/images/audioStream.png';

interface StreamThumbnailProps {
  title: string;
  owner: string;
  topic: string;
  manifestUrl: string;
  mediaType: MediaType;
  thumbnailRef?: string;
  state?: StateType;
  duration?: number;
  pinned?: boolean;
}

export const StreamThumbnail: React.FC<StreamThumbnailProps> = ({
  manifestUrl,
  thumbnailRef,
  owner,
  topic,
  state,
  duration,
  mediaType,
  title,
  pinned,
}) => {
  const navigate = useNavigate();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleClick = useCallback(() => {
    navigate(`/watch/${mediaType}/${owner}/${topic}`);
  }, [navigate, mediaType, owner, topic]);

  useEffect(() => {
    let mounted = true;

    const loadThumbnail = async () => {
      setIsLoading(true);

      try {
        const url = await thumbnailCache.getThumbnail({
          manifestUrl,
          thumbnailRef,
          owner,
          topic,
          mediaType,
          state,
        });

        if (mounted) {
          setThumbnailUrl(url);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading thumbnail:', error);
        if (mounted) {
          setThumbnailUrl(null);
          setIsLoading(false);
        }
      }
    };

    loadThumbnail();

    return () => {
      mounted = false;
    };
  }, [manifestUrl, thumbnailRef, owner, topic, mediaType, state]);

  const shouldShowDefault = !isLoading && !thumbnailUrl;

  return (
    <div className={`stream-thumbnail ${pinned ? 'stream-thumbnail--pinned' : ''}`}>
      <div className="stream-thumbnail-media" onClick={handleClick}>
        {isLoading && <LoadingSpinner />}

        {thumbnailUrl && !isLoading && <img src={thumbnailUrl} alt={title} className="stream-thumbnail-image" />}

        {shouldShowDefault && <img src={AudioStreamImage} alt="Stream thumbnail" className="stream-thumbnail-image" />}

        {shouldShowDefault && mediaType === MediaType.AUDIO && <AudioIcon />}
        {shouldShowDefault && mediaType === MediaType.VIDEO && <VideoIcon />}

        {!isLoading && (
          <>
            <div className="stream-thumbnail-play-overlay">
              <img src={PlayIcon} alt="Play" />
            </div>
            {state === StateType.LIVE && <LiveBadge />}
            {duration && state !== StateType.LIVE && <DurationBadge duration={duration} />}
          </>
        )}
      </div>

      <div className="stream-thumbnail-metadata">
        <h3 className="stream-thumbnail-title" title={title}>
          {title}
        </h3>
      </div>
    </div>
  );
};

const LoadingSpinner: React.FC = () => (
  <div className="stream-thumbnail-loading">
    <div className="stream-thumbnail-spinner"></div>
  </div>
);

const LiveBadge: React.FC = () => <span className="stream-thumbnail-live-badge">LIVE</span>;

const DurationBadge: React.FC<{ duration: number }> = ({ duration }) => (
  <span className="stream-thumbnail-duration-badge">{formatDuration(duration)}</span>
);

const AudioIcon: React.FC = () => (
  <div className="stream-thumbnail-audio-icon">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M9 18V5l12-2v13M9 18c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zm12-2c0 1.657-1.343 3-3 3s-3-1.343-3-3 1.343-3 3-3 3 1.343 3 3zM9 10l12-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

const VideoIcon: React.FC = () => (
  <div className="stream-thumbnail-video-icon">
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23 7l-7 5 7 5V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect
        x="1"
        y="5"
        width="15"
        height="14"
        rx="2"
        ry="2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);
