import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Hls, { Events } from 'hls.js';
import PQueue from 'p-queue';

import PlayIcon from '@/assets/icons/playIcon.png';
import DefaultPreviewImage from '@/assets/images/defaultPreviewImage.png';
import { MediaType, StateType } from '@/types/stream';
import { config } from '@/utils/config';
import { formatDuration } from '@/utils/format';

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

const useThumbnailFetcher = () => {
  const fetchThumbnail = useCallback(async (ref: string): Promise<string | null> => {
    try {
      const response = await fetch(`${config.readerBeeUrl}/bzz/${ref}/`);

      if (!response.ok) {
        throw new Error(`Failed to fetch thumbnail: ${response.status}`);
      }

      const blob = await response.blob();

      if (!blob.type.startsWith('image/')) {
        throw new Error('Fetched content is not an image');
      }

      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error fetching thumbnail:', error);
      return null;
    }
  }, []);

  return fetchThumbnail;
};

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

const ThumbnailOverlay: React.FC<{
  title: string;
  state?: StateType;
  duration?: number;
}> = ({ title, state, duration }) => (
  <div className="stream-thumbnail-button-wrapper">
    <img src={PlayIcon} alt="play-icon" />
    <div className="stream-thumbnail-button">
      <span className="stream-thumbnail-button-title">{title}</span>
      {state === StateType.LIVE && <span className="stream-thumbnail-button-state">{state}</span>}
      {duration && <span className="stream-thumbnail-button-duration">{formatDuration(duration)}</span>}
    </div>
  </div>
);

const LoadingSpinner: React.FC = () => (
  <div className="stream-thumbnail-overlay">
    <div className="spinner"></div>
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
}) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [thumbnailState, setThumbnailState] = useState<ThumbnailState>({
    isLoading: true,
    thumbnailUrl: null,
    hasData: false,
  });

  const fetchThumbnail = useThumbnailFetcher();
  const { captureFromHls, cleanup: cleanupHls } = useHlsThumbnailCapture(videoRef, manifestUrl);

  const handleClick = useCallback(() => {
    navigate(`/watch/${mediaType}/${owner}/${topic}`);
  }, [navigate, mediaType, owner, topic]);

  const loadThumbnail = useCallback(async () => {
    setThumbnailState((prev) => ({ ...prev, isLoading: true }));

    // For scheduled streams, only use fetched thumbnail
    if (state === StateType.SCHEDULED) {
      if (thumbnailRef) {
        const url = await fetchThumbnail(thumbnailRef);
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
      const url = await fetchThumbnail(thumbnailRef);
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
  }, [state, thumbnailRef, fetchThumbnail, captureFromHls]);

  useEffect(() => {
    loadThumbnail();

    return () => {
      cleanupHls();
      if (thumbnailState.thumbnailUrl) {
        URL.revokeObjectURL(thumbnailState.thumbnailUrl);
      }
    };
  }, [loadThumbnail]);

  const { isLoading, thumbnailUrl, hasData } = thumbnailState;
  const shouldShowVideo = !thumbnailUrl && hasData;
  const shouldShowDefault = !isLoading && !hasData;
  const shouldShowOverlay = !isLoading && hasData;

  return (
    <div className="stream-thumbnail" onClick={handleClick}>
      {isLoading && <LoadingSpinner />}

      {thumbnailUrl && !isLoading && (
        <div className="stream-thumbnail-img">
          <img src={thumbnailUrl} alt={title} />
        </div>
      )}

      {shouldShowVideo && (
        <video ref={videoRef} className="stream-thumbnail-video" controls={false} muted playsInline />
      )}

      {shouldShowOverlay && <ThumbnailOverlay title={title} state={state} duration={duration} />}

      {shouldShowDefault && (
        <div className="stream-thumbnail-img">
          <img src={DefaultPreviewImage} alt="" />
        </div>
      )}
    </div>
  );
};
