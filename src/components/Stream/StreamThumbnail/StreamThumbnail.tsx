import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Hls, { Events } from 'hls.js';
import PQueue from 'p-queue';

import { MediaType, StateType } from '@/types/stream';
import { fetchThumbnail } from '@/utils/stream/stream';
import { formatDuration } from '@/utils/ui/format';

import './StreamThumbnail.scss';

const PlayIcon = '/assets/icons/playIcon.png';
const AudioStreamImage = '/assets/images/audioStream.png';

const THUMBNAIL_CONFIG = {
  MAX_RETRY_COUNT: 2,
  RETRY_TIMEOUT_MS: 3500,
  LOAD_QUEUE_CONCURRENCY: 2,
  CAPTURE_TIME_SECONDS: 1,
  VIDEO_LOAD_TIMEOUT_MS: 6000,
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

const activeHlsInstances = new Map<string, Hls>();

const captureVideoFrame = async (video: HTMLVideoElement): Promise<string | null> => {
  try {
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<string | null>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            resolve(null);
          }
        },
        'image/jpeg',
        0.9,
      );
    });
  } catch (error) {
    console.error('Error capturing video frame:', error);
    return null;
  }
};

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
  const captureAttemptedRef = useRef(false);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  const [thumbnailState, setThumbnailState] = useState<ThumbnailState>({
    isLoading: true,
    thumbnailUrl: null,
    hasData: false,
  });

  const handleClick = useCallback(() => {
    navigate(`/watch/${mediaType}/${owner}/${topic}`);
  }, [navigate, mediaType, owner, topic]);

  const captureFromHls = useCallback(async (): Promise<string | null> => {
    if (!videoRef.current || captureAttemptedRef.current) return null;

    const video = videoRef.current;

    const existingHls = activeHlsInstances.get(manifestUrl);
    if (existingHls && !existingHls.media) {
      existingHls.destroy();
      activeHlsInstances.delete(manifestUrl);
    }

    return new Promise<string | null>((resolve) => {
      let hls: Hls | null = null;
      let isResolved = false;

      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          console.error('HLS capture timeout');
          cleanup();
          resolve(null);
        }
      }, THUMBNAIL_CONFIG.VIDEO_LOAD_TIMEOUT_MS);

      const cleanup = () => {
        if (isResolved) return;
        isResolved = true;

        clearTimeout(timeoutId);

        if (hls) {
          hls.stopLoad();
          cleanupTimeoutRef.current = setTimeout(() => {
            if (hls && activeHlsInstances.get(manifestUrl) === hls) {
              hls.destroy();
              activeHlsInstances.delete(manifestUrl);
            }
          }, 100);
        }
      };

      const captureFrame = async () => {
        if (isResolved) return;

        try {
          await video.play();
          await new Promise((r) => setTimeout(r, 250)); // Let video render
          video.pause();

          const url = await captureVideoFrame(video);
          cleanup();
          resolve(url);
          captureAttemptedRef.current = true;
        } catch (error) {
          console.error('Error during frame capture:', error);
          cleanup();
          resolve(null);
        }
      };

      hls = new Hls({
        enableWorker: true,
        maxBufferLength: 3,
        maxMaxBufferLength: 5,
        startLevel: -1, // Auto quality
      });

      activeHlsInstances.set(manifestUrl, hls);

      let hasLoadedData = false;

      const onManifestParsed = () => {
        // Wait for actual video data
      };

      const onFragBuffered = () => {
        if (!hasLoadedData && !isResolved) {
          hasLoadedData = true;
          // Give video time to decode
          setTimeout(() => {
            if (!isResolved && video.readyState >= 2) {
              captureFrame();
            }
          }, 500);
        }
      };

      const onError = (_event: Events.ERROR, data: any) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          cleanup();
          resolve(null);
        }
      };

      // Video events
      video.onloadeddata = () => {
        if (!isResolved && hasLoadedData) {
          captureFrame();
        }
      };

      video.onerror = () => {
        cleanup();
        resolve(null);
      };

      hls.on(Events.MANIFEST_PARSED, onManifestParsed);
      hls.on(Events.FRAG_BUFFERED, onFragBuffered);
      hls.on(Events.ERROR, onError);

      hls.attachMedia(video);
      hls.loadSource(manifestUrl);
      hls.startLoad();
    });
  }, [manifestUrl]);

  useEffect(() => {
    let isSubscribed = true;
    captureAttemptedRef.current = false;

    const loadThumbnail = async () => {
      if (!isSubscribed) return;

      setThumbnailState({ isLoading: true, thumbnailUrl: null, hasData: false });

      // For scheduled and audio streams, only try fetched thumbnail
      if (state === StateType.SCHEDULED || mediaType === MediaType.AUDIO) {
        if (thumbnailRef) {
          try {
            const url = (await fetchThumbnail(thumbnailRef, { url: true })) as string;
            if (isSubscribed && url) {
              setThumbnailState({
                isLoading: false,
                thumbnailUrl: url,
                hasData: true,
              });
              return;
            }
          } catch (error) {
            console.error('Error fetching thumbnail:', error);
          }
        }

        if (isSubscribed) {
          setThumbnailState({
            isLoading: false,
            thumbnailUrl: null,
            hasData: false,
          });
        }
        return;
      }

      // For video streams: try fetched thumbnail first
      if (thumbnailRef) {
        try {
          const url = (await fetchThumbnail(thumbnailRef, { url: true })) as string;
          if (isSubscribed && url) {
            setThumbnailState({
              isLoading: false,
              thumbnailUrl: url,
              hasData: true,
            });
            return;
          }
        } catch (error) {
          console.error('Error fetching thumbnail:', error);
        }
      }

      // Fallback to HLS capture for video
      if (mediaType === MediaType.VIDEO && manifestUrl) {
        // Use queue to prevent concurrent captures
        const captureResult = await loadQueue.add<string | null>(async () => {
          if (!isSubscribed) return null;
          return captureFromHls();
        });

        const capturedUrl = captureResult ?? null;

        if (isSubscribed) {
          setThumbnailState({
            isLoading: false,
            thumbnailUrl: capturedUrl,
            hasData: !!capturedUrl,
          });
        } else if (capturedUrl) {
          URL.revokeObjectURL(capturedUrl);
        }
      } else {
        if (isSubscribed) {
          setThumbnailState({
            isLoading: false,
            thumbnailUrl: null,
            hasData: false,
          });
        }
      }
    };

    const timeoutId = setTimeout(() => {
      if (isSubscribed) {
        loadThumbnail();
      }
    }, 50);

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);

      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }

      // Clean up blob URL
      if (thumbnailState.thumbnailUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailState.thumbnailUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifestUrl, thumbnailRef, state, mediaType]);

  const { isLoading, thumbnailUrl } = thumbnailState;
  const shouldShowDefault = !isLoading && !thumbnailUrl;

  return (
    <div className={`stream-thumbnail ${pinned ? 'stream-thumbnail--pinned' : ''}`}>
      <div className="stream-thumbnail-media" onClick={handleClick}>
        {isLoading && <LoadingSpinner />}

        {thumbnailUrl && !isLoading && <img src={thumbnailUrl} alt={title} className="stream-thumbnail-image" />}

        {/* Hidden video for capture */}
        <video
          ref={videoRef}
          muted
          playsInline
          preload="metadata"
          style={{
            position: 'fixed',
            top: '-9999px',
            left: '-9999px',
            width: '320px',
            height: '180px',
            opacity: 0,
            pointerEvents: 'none',
          }}
        />

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

// Component definitions
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
