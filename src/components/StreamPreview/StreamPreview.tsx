import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Hls, { Events } from 'hls.js';
import PQueue from 'p-queue';

import PlayIcon from '@/assets/icons/playIcon.png';
import DefaultPreviewImage from '@/assets/images/defaultPreviewImage.png';
import { MediaType } from '@/pages/StreamWatcher/StreamWatcher';
import { formatDuration } from '@/utils/format';

import './StreamPreview.scss';

const THUMBNAIL_RETRY_COUNT = 10;
const THUMBNAIL_RETRY_TIMEOUT = 2500;

interface StreamPreviewProps {
  manifestUrl: string;
  owner: string;
  topic: string;
  state?: string;
  duration?: string;
  mediatype: MediaType;
  title: string;
}

const loadQueue = new PQueue({ concurrency: 5 });

export const StreamPreview = ({ manifestUrl, owner, topic, state, duration, mediatype, title }: StreamPreviewProps) => {
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnailHls = useRef<Hls | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [isDataAvailable, setIsDataAvailable] = useState(false);
  const retryCount = useRef(0);

  const captureThumbnail = async () => {
    if (!videoRef.current) return;

    try {
      const hls = new Hls();
      thumbnailHls.current = hls;

      await loadQueue.add(() => {
        return new Promise<void>((resolve, reject) => {
          hls.attachMedia(videoRef.current!);
          hls.loadSource(manifestUrl);

          const onFragChanged = () => {
            hls.off(Events.FRAG_CHANGED, onFragChanged);
            hls.off(Events.ERROR, onError);

            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.pause();
              setShowThumbnail(true);
              setIsLoading(false);
              hls.stopLoad();
              setIsDataAvailable(true);
            }

            resolve();
          };

          const onError = (_event: any, data: any) => {
            hls.off(Events.FRAG_CHANGED, onFragChanged);
            hls.off(Events.ERROR, onError);

            console.error('Error loading thumbnail', data);

            if (!isDataAvailable && retryCount.current < THUMBNAIL_RETRY_COUNT) {
              retryCount.current += 1;

              setTimeout(() => {
                captureThumbnail();
              }, THUMBNAIL_RETRY_TIMEOUT);

              resolve(); // Still resolve this task to prevent queue blocking
            } else {
              setIsLoading(false);
              hls.stopLoad();
              reject(new Error('Thumbnail loading failed'));
            }
          };

          hls.on(Events.FRAG_CHANGED, onFragChanged);
          hls.on(Events.ERROR, onError);
        });
      });
    } catch (error) {
      console.error('Thumbnail capture failed:', error);
      setIsLoading(false);
    }
  };

  const handlePlayToggle = () => {
    navigate(`/watch/${mediatype}/${owner}/${topic}`);
  };

  useEffect(() => {
    captureThumbnail();
    return () => {
      thumbnailHls.current?.destroy();
    };
  }, [manifestUrl]);

  return (
    <div className="stream-preview" onClick={handlePlayToggle}>
      {isLoading && (
        <div className="stream-preview-overlay">
          <div className="spinner"></div>
        </div>
      )}
      <video ref={videoRef} className="stream-preview-video" controls={false} muted playsInline />

      {showThumbnail && !isLoading && isDataAvailable && (
        <div className="stream-preview-button-wrapper">
          <img src={PlayIcon} alt="play-icon" />
          <div className="stream-preview-button">
            <span className="stream-preview-button-title">{title}</span>
            {state === 'live' && <span className="stream-preview-button-state">{state}</span>}
            {duration && (
              <span className="stream-preview-button-duration">{formatDuration(Number.parseFloat(duration))}</span>
            )}
          </div>
        </div>
      )}
      {showThumbnail && !isLoading && !isDataAvailable && (
        <div className="stream-preview-error">
          <img src={DefaultPreviewImage} alt="" />
        </div>
      )}
    </div>
  );
};
