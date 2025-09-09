import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Hls, { Events } from 'hls.js';
import PQueue from 'p-queue';

import PlayIcon from '@/assets/icons/playIcon.png';
import DefaultPreviewImage from '@/assets/images/defaultPreviewImage.png';
import { MediaType, StateType } from '@/types/stream';
import { formatDuration } from '@/utils/format';
import { fetchThumbnail } from '@/utils/stream';

import './StreamThumbnail.scss';

const THUMBNAIL_CONFIG = {
  MAX_RETRY_COUNT: 10,
  RETRY_TIMEOUT_MS: 2500,
  LOAD_QUEUE_CONCURRENCY: 1,
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
            videoRef.current.currentTime = 0;
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

  // Cleanup function
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

export const StreamThumbnail: React.FC<StreamThumbnailProps> = ({
  manifestUrl,
  thumbnailRef,
  owner,
  topic,
  state,
  duration,
  mediaType,
  title,
}) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [thumbnailState, setThumbnailState] = useState<ThumbnailState>({
    isLoading: true,
    thumbnailUrl: null,
    hasData: false,
  });

  const { captureFromHls, cleanup: cleanupHls } = useHlsThumbnailCapture(videoRef, manifestUrl);

  const handleClick = useCallback(() => {
    if (state === StateType.SCHEDULED) {
      navigate(`/watch/${mediaType}/${owner}/${topic}/scheduled`);
    } else {
      navigate(`/watch/${mediaType}/${owner}/${topic}`);
    }
  }, [navigate, mediaType, owner, topic, state]);

  const loadThumbnail = useCallback(async () => {
    setThumbnailState((prev) => ({ ...prev, isLoading: true }));

    // For scheduled streams, only use fetched thumbnail
    if (state === StateType.SCHEDULED) {
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
      cleanupHls();
      if (thumbnailState.thumbnailUrl) {
        URL.revokeObjectURL(thumbnailState.thumbnailUrl);
      }
    };
  }, [loadThumbnail]); // eslint-disable-line react-hooks/exhaustive-deps

  const { isLoading, thumbnailUrl, hasData } = thumbnailState;
  const shouldShowVideo = !thumbnailUrl && hasData;
  const shouldShowDefault = !isLoading && !hasData;

  return (
    <div className="stream-thumbnail">
      <div className="stream-thumbnail-media" onClick={handleClick}>
        {isLoading && <LoadingSpinner />}

        {thumbnailUrl && !isLoading && <img src={thumbnailUrl} alt={title} className="stream-thumbnail-image" />}

        {shouldShowVideo && (
          <video ref={videoRef} className="stream-thumbnail-video" controls={false} muted playsInline />
        )}

        {shouldShowDefault && (
          <img src={DefaultPreviewImage} alt="Default thumbnail" className="stream-thumbnail-image" />
        )}

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
