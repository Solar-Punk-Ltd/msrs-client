import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Hls, { Events } from 'hls.js';
import PQueue from 'p-queue';

import PlayIcon from '@/assets/icons/playIcon.png';
import AudioStreamImage from '@/assets/images/audioStream.png';
import DefaultPreviewImage from '@/assets/images/defaultPreviewImage.png';
import { MediaType, StateType } from '@/types/stream';
import { fetchThumbnail } from '@/utils/stream/stream';
import { formatDuration } from '@/utils/ui/format';

import './StreamThumbnail.scss';

const THUMBNAIL_CONFIG = {
  MAX_RETRY_COUNT: 2,
  RETRY_TIMEOUT_MS: 3500,
  LOAD_QUEUE_CONCURRENCY: 2,
} as const;

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

interface ThumbnailState {
  isLoading: boolean;
  thumbnailUrl: string | null;
  hasData: boolean;
}

const loadQueue = new PQueue({ concurrency: THUMBNAIL_CONFIG.LOAD_QUEUE_CONCURRENCY });

const useHlsThumbnailCapture = (videoRef: React.RefObject<HTMLVideoElement>, manifestUrl: string) => {
  const hlsRef = useRef<Hls | null>(null);
  const retryCountRef = useRef(0);

  const captureFromHls = useCallback(async (): Promise<boolean> => {
    if (!videoRef.current) return false;

    const result = await loadQueue.add(async () => {
      return new Promise<boolean>((resolve) => {
        const hls = new Hls();
        hlsRef.current = hls;

        const cleanup = () => {
          hls.off(Events.FRAG_CHANGED, onFragChanged);
          hls.off(Events.ERROR, onError);
        };

        const onFragChanged = () => {
          cleanup();

          if (videoRef.current) {
            videoRef.current.currentTime = 0.1;
            videoRef.current.pause();
            hls.stopLoad();
          }

          resolve(true);
        };

        const onError = (_event: any, data: any) => {
          console.error('HLS loading error:', data);
          cleanup();

          if (retryCountRef.current < THUMBNAIL_CONFIG.MAX_RETRY_COUNT) {
            retryCountRef.current++;
            setTimeout(() => captureFromHls(), THUMBNAIL_CONFIG.RETRY_TIMEOUT_MS);
            resolve(false);
          } else {
            hls.stopLoad();
            resolve(false);
          }
        };

        hls.on(Events.FRAG_CHANGED, onFragChanged);
        hls.on(Events.ERROR, onError);

        hls.attachMedia(videoRef.current!);
        hls.loadSource(manifestUrl);
      });
    });

    return result ?? false;
  }, [manifestUrl, videoRef]);

  const cleanup = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
  }, []);

  return { captureFromHls, cleanup };
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
  const videoRef = useRef<HTMLVideoElement>(null);

  const [thumbnailState, setThumbnailState] = useState<ThumbnailState>({
    isLoading: true,
    thumbnailUrl: null,
    hasData: false,
  });

  const { captureFromHls, cleanup: _cleanupHls } = useHlsThumbnailCapture(videoRef, manifestUrl);

  const handleClick = useCallback(() => {
    navigate(`/watch/${mediaType}/${owner}/${topic}`);
  }, [navigate, mediaType, owner, topic]);

  const loadThumbnail = useCallback(async () => {
    setThumbnailState((prev) => ({ ...prev, isLoading: true }));

    // For scheduled and audio streams, only try to use fetched thumbnail
    if (state === StateType.SCHEDULED || mediaType === MediaType.AUDIO) {
      if (thumbnailRef) {
        const url = (await fetchThumbnail(thumbnailRef, { url: true })) as string;
        setThumbnailState({
          isLoading: false,
          thumbnailUrl: url,
          hasData: !!url,
        });
      } else {
        setThumbnailState({
          isLoading: false,
          thumbnailUrl: null,
          hasData: false,
        });
      }
      return;
    }

    // For non-scheduled: try fetch first, then HLS capture
    if (thumbnailRef) {
      const url = (await fetchThumbnail(thumbnailRef, { url: true })) as string;
      if (url) {
        setThumbnailState({
          isLoading: false,
          thumbnailUrl: url,
          hasData: true,
        });
        return;
      }
    }

    // Fallback to HLS capture
    const success = await captureFromHls();
    setThumbnailState({
      isLoading: false,
      thumbnailUrl: null,
      hasData: success,
    });
  }, [state, thumbnailRef, captureFromHls]);

  useEffect(() => {
    loadThumbnail();

    return () => {
      if (thumbnailState.thumbnailUrl) {
        URL.revokeObjectURL(thumbnailState.thumbnailUrl);
      }
    };
  }, [loadThumbnail]);

  const { isLoading, thumbnailUrl, hasData } = thumbnailState;
  const shouldShowVideo = !thumbnailUrl && hasData;
  const shouldShowDefault = !isLoading && !hasData;
  const defaultImage = mediaType === MediaType.AUDIO ? AudioStreamImage : DefaultPreviewImage;
  const defaultImageAlt = mediaType === MediaType.AUDIO ? 'Audio stream' : 'Default thumbnail';

  return (
    <div className={`stream-thumbnail ${pinned ? 'stream-thumbnail--pinned' : ''}`}>
      <div className="stream-thumbnail-media" onClick={handleClick}>
        {isLoading && <LoadingSpinner />}

        {thumbnailUrl && !isLoading && <img src={thumbnailUrl} alt={title} className="stream-thumbnail-image" />}

        {/* Always render video element for HLS capture, but only show when needed */}
        <video
          ref={videoRef}
          className="stream-thumbnail-video"
          controls={false}
          muted
          playsInline
          style={{ display: shouldShowVideo ? 'block' : 'none' }}
        />

        {shouldShowDefault && <img src={defaultImage} alt={defaultImageAlt} className="stream-thumbnail-image" />}

        {shouldShowDefault && mediaType === MediaType.AUDIO && <AudioIcon />}

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
