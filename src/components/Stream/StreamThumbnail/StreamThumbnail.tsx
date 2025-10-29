import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FeedIndex, Topic } from '@ethersphere/bee-js';
import PQueue from 'p-queue';

import PlayIcon from '@/assets/icons/playIcon.png';
import DefaultPreviewImage from '@/assets/images/defaultPreviewImage.png';
import { MediaType, StateType } from '@/types/stream';
import { makeFeedIdentifier } from '@/utils/network/bee';
import { config } from '@/utils/shared/config';
import { fetchThumbnail } from '@/utils/stream/stream';
import { formatDuration } from '@/utils/ui/format';

import './StreamThumbnail.scss';

const THUMBNAIL_CONFIG = {
  MAX_RETRY_COUNT: 2,
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
  pinned?: boolean;
}

interface ThumbnailState {
  isLoading: boolean;
  thumbnailUrl: string | null;
  hasData: boolean;
}

const loadQueue = new PQueue({ concurrency: THUMBNAIL_CONFIG.LOAD_QUEUE_CONCURRENCY });

const useDirectSegmentCapture = (videoRef: React.RefObject<HTMLVideoElement>, owner: string, topic: string) => {
  const retryCountRef = useRef(0);

  const captureFromSegment = useCallback(async (): Promise<boolean> => {
    if (!videoRef.current) return false;

    const result = await loadQueue.add(async () => {
      return new Promise<boolean>((resolve) => {
        const attemptLoad = async () => {
          try {
            // Fetch the first segment directly from feed index 1
            const topicObj = Topic.fromString(topic);
            const feedIndex = FeedIndex.fromBigInt(BigInt(1));
            const identifier = makeFeedIdentifier(topicObj, feedIndex);
            const segmentUrl = `${config.readerBeeUrl}/soc/${owner}/${identifier.toHex()}`;

            const response = await fetch(segmentUrl);

            if (!response.ok) {
              throw new Error(`Failed to fetch segment: ${response.status}`);
            }

            const blob = await response.blob();

            const objectUrl = URL.createObjectURL(blob);

            if (!videoRef.current) {
              URL.revokeObjectURL(objectUrl);
              resolve(false);
              return;
            }

            const video = videoRef.current;

            const onLoadedData = () => {
              video.removeEventListener('loadeddata', onLoadedData);
              video.removeEventListener('error', onError);
              video.currentTime = 0;
              video.pause();
              // Don't revoke the objectUrl here - it's still needed for display
              // It will be revoked when component unmounts or new thumbnail loads
              resolve(true);
            };

            const onError = () => {
              video.removeEventListener('loadeddata', onLoadedData);
              video.removeEventListener('error', onError);
              URL.revokeObjectURL(objectUrl);

              if (retryCountRef.current < THUMBNAIL_CONFIG.MAX_RETRY_COUNT) {
                retryCountRef.current++;
                console.log(
                  `Retrying thumbnail capture (${retryCountRef.current}/${THUMBNAIL_CONFIG.MAX_RETRY_COUNT})`,
                );
                setTimeout(() => attemptLoad(), THUMBNAIL_CONFIG.RETRY_TIMEOUT_MS);
              } else {
                console.warn('Max retries reached for thumbnail capture');
                resolve(false);
              }
            };

            video.addEventListener('loadeddata', onLoadedData);
            video.addEventListener('error', onError);
            video.src = objectUrl;
            video.load();
          } catch (error) {
            console.error('Error loading segment:', error);

            if (retryCountRef.current < THUMBNAIL_CONFIG.MAX_RETRY_COUNT) {
              retryCountRef.current++;
              console.log(`Retrying thumbnail capture (${retryCountRef.current}/${THUMBNAIL_CONFIG.MAX_RETRY_COUNT})`);
              setTimeout(() => attemptLoad(), THUMBNAIL_CONFIG.RETRY_TIMEOUT_MS);
            } else {
              resolve(false);
            }
          }
        };

        attemptLoad();
      });
    });

    return result ?? false;
  }, [owner, topic, videoRef]);

  return { captureFromSegment };
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
  manifestUrl: _manifestUrl,
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

  const { captureFromSegment } = useDirectSegmentCapture(videoRef, owner, topic);

  const handleClick = useCallback(() => {
    navigate(`/watch/${mediaType}/${owner}/${topic}`);
  }, [navigate, mediaType, owner, topic]);

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

    // For non-scheduled: try fetch first, then direct segment capture
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

    // Fallback to direct segment capture
    const success = await captureFromSegment();
    setThumbnailState({
      isLoading: false,
      thumbnailUrl: null,
      hasData: success,
    });
  }, [state, thumbnailRef, captureFromSegment]);

  useEffect(() => {
    loadThumbnail();
  }, [loadThumbnail]);

  // Cleanup for image thumbnails
  useEffect(() => {
    const currentThumbnailUrl = thumbnailState.thumbnailUrl;
    return () => {
      if (currentThumbnailUrl) {
        URL.revokeObjectURL(currentThumbnailUrl);
      }
    };
  }, [thumbnailState.thumbnailUrl]);

  // Cleanup for video element blob URLs
  useEffect(() => {
    return () => {
      if (videoRef.current?.src && videoRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(videoRef.current.src);
        videoRef.current.src = '';
      }
    };
  }, [thumbnailState.hasData]);

  const { isLoading, thumbnailUrl, hasData } = thumbnailState;
  const shouldShowVideo = !thumbnailUrl && hasData;
  const shouldShowDefault = !isLoading && !hasData;

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
