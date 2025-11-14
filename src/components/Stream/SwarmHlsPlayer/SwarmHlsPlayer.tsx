import React, { useEffect, useRef, useState } from 'react';
import { Topic } from '@ethersphere/bee-js';
import Hls, { ErrorDetails, ErrorTypes, Events } from 'hls.js';

import { InputLoading } from '@/components/InputLoading/InputLoading';
import { MediaType, StateType } from '@/types/stream';

import { clearStreamMetadata, CustomManifestLoader, setStreamMetadata } from './CustomManifestLoader';

import './SwarmHlsPlayer.scss';

interface HlsPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  owner: string;
  topic: string;
  mediaType: MediaType;
  streamState?: StateType;
  isExternal?: boolean;
  manifestIndex?: number;
}

export const SwarmHlsPlayer: React.FC<HlsPlayerProps> = ({
  owner,
  topic,
  mediaType,
  streamState,
  isExternal,
  manifestIndex,
  autoPlay = true,
  controls = true,
  ...videoProps
}) => {
  const [restartTrigger, setRestartTrigger] = useState(0);
  const [hasFatalError, setHasFatalError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isVod, setIsVod] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    retryCountRef.current = 0;
    setHasFatalError(false);
    setIsReady(false);
    setIsVod(false);
  }, [owner, topic]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const hexTopic = Topic.fromString(topic).toString();
    setStreamMetadata(hexTopic, {
      state: streamState,
      isExternal,
      index: manifestIndex,
    });

    setIsReady(false);
    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        pLoader: CustomManifestLoader,
        liveSyncDuration: 10,
        liveMaxLatencyDuration: 30,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1024 * 1024, // 60MB
        maxBufferHole: 1,
      });

      const restartStream = () => {
        retryCountRef.current += 1;
        console.warn(`Restarting stream (attempt ${retryCountRef.current}/${MAX_RETRIES})`);

        if (retryCountRef.current >= MAX_RETRIES) {
          console.error('Max retries exceeded. Stream cannot be recovered.');
          setHasFatalError(true);
          hls?.destroy();
          return;
        }

        hls?.destroy();
        setRestartTrigger((prev) => prev + 1);
      };

      video.addEventListener('pause', () => {
        hls?.stopLoad();
      });

      video.addEventListener('play', () => {
        hls?.startLoad();
      });

      hls.on(Events.ERROR, (_event, data) => {
        console.error('HLS.js error:', data);

        if (
          !data.fatal &&
          (data.details === ErrorDetails.FRAG_LOAD_TIMEOUT || data.details === ErrorDetails.FRAG_LOAD_ERROR)
        ) {
          console.warn('Fragment load issue - HLS.js will skip to next segment');
          return;
        }

        if (data.fatal) {
          if (data.details === ErrorDetails.LEVEL_PARSING_ERROR) {
            console.error('Media sequence mismatch detected, reloading stream.');
            restartStream();
            return;
          }

          switch (data.type) {
            case ErrorTypes.NETWORK_ERROR:
              console.warn('Fatal network error');
              restartStream();
              break;
            case ErrorTypes.MEDIA_ERROR:
              console.warn('Fatal media error');
              hls?.recoverMediaError();
              break;
            default:
              console.error('Unrecoverable fatal error. Destroying and restarting.');
              restartStream();
              break;
          }
        }
      });

      hls.attachMedia(video);
      hls.loadSource(`${owner}/${topic}`);

      hls.on(Events.MANIFEST_PARSED, (_event, data) => {
        retryCountRef.current = 0;
        setHasFatalError(false);
        setIsReady(true);

        // Check if the stream is VOD by checking if the playlist has an end tag
        // For live streams, levels[0].details.live will be true
        const isLive = data.levels?.[0]?.details?.live ?? true;
        setIsVod(!isLive);

        if (autoPlay) {
          video.play().catch((err) => {
            console.warn('Auto-play failed:', err);
          });
        }
      });

      // Listen for level updates to detect when stream becomes VOD
      hls.on(Events.LEVEL_UPDATED, (_event, data) => {
        // Check if playlist has ended (VOD marker)
        const hasEnded = data.details?.live === false;
        if (hasEnded) {
          setIsVod(true);
        }
      });
    } else {
      console.error('HLS is not supported in this browser.');
    }

    return () => {
      const hexTopic = Topic.fromString(topic).toString();
      clearStreamMetadata(hexTopic);

      if (hls) {
        hls.destroy();
        hls = null;
      }
    };
  }, [autoPlay, restartTrigger, owner, topic, streamState, isExternal, manifestIndex]);

  if (hasFatalError) {
    return (
      <div className="swarm-hls-player-error">
        <h2>Something went wrong!</h2>
        <p>The stream could not be loaded. Please try again later.</p>
      </div>
    );
  }

  return (
    <>
      {!isReady && (
        <div className="swarm-hls-player-loading">
          <InputLoading />
          <h2>Loading stream...</h2>
        </div>
      )}
      {mediaType === MediaType.VIDEO ? (
        <video
          className={`swarm-hls-player-video ${!isVod ? 'swarm-hls-player-live' : ''}`}
          ref={videoRef}
          controls={controls}
          autoPlay={autoPlay}
          muted
          playsInline
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          style={{ display: isReady ? 'block' : 'none' }}
          {...videoProps}
        />
      ) : (
        <audio
          className={`swarm-hls-player-audio ${!isVod ? 'swarm-hls-player-live' : ''}`}
          ref={videoRef}
          controls={controls}
          autoPlay={autoPlay}
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          style={{ display: isReady ? 'block' : 'none' }}
        />
      )}
    </>
  );
};
