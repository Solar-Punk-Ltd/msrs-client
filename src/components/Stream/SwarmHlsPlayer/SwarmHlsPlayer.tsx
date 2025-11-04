import React, { useEffect, useRef, useState } from 'react';
import { Topic } from '@ethersphere/bee-js';
import Hls, { ErrorDetails, ErrorTypes, Events } from 'hls.js';

import { InputLoading } from '@/components/InputLoading/InputLoading';
import { useSerializedEffect } from '@/hooks/useSerializedEffect';
import { useWakuContext } from '@/providers/Waku';
import { MessageReceiveMode } from '@/types/messaging';
import { MediaType } from '@/types/stream';
import { config } from '@/utils/shared/config';

import { ManifestStateManager } from './ManifestManagement/ManifestStateManager';
import { CustomManifestLoader } from './CustomManifestLoader';

import './SwarmHlsPlayer.scss';

interface HlsPlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  owner: string;
  topic: string;
  mediaType: MediaType;
}

export const SwarmHlsPlayer: React.FC<HlsPlayerProps> = ({
  owner,
  topic,
  mediaType,
  autoPlay = true,
  controls = true,
  ...videoProps
}) => {
  const { channelManager } = useWakuContext();
  const [restartTrigger, setRestartTrigger] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasFatalError, setHasFatalError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  useSerializedEffect(
    `swarm-hls-player-${owner}-${topic}`,
    async (isMounted) => {
      const topicObj = Topic.fromString(topic);
      const hexTopic = topicObj.toString();
      const stateManager = ManifestStateManager.getInstance();
      const messageReceiveMode = config.messageReceiveMode;

      const shouldUseWaku =
        messageReceiveMode === MessageReceiveMode.WAKU || messageReceiveMode === MessageReceiveMode.BOTH;

      if (shouldUseWaku && !channelManager) {
        console.log('⏸️ Waiting for channel manager to become available...');

        await stateManager.clear(hexTopic);

        if (isMounted()) {
          setIsReady(false);
        }
        return;
      }

      try {
        await stateManager.setChannelManager(shouldUseWaku ? channelManager : null);

        if (!isMounted()) {
          console.log('⏭️ Component unmounted during channel manager setup');
          return;
        }

        await stateManager.setupStreamSubscription(owner, topicObj);

        if (!isMounted()) {
          console.log('⏭️ Component unmounted during subscription setup, cleaning up');
          await stateManager.clear(hexTopic);
          return;
        }

        console.log(`Stream subscription ready (mode: ${messageReceiveMode})`);
        setIsReady(true);
      } catch (error) {
        if (!isMounted()) {
          console.log('⏭️ Component unmounted, ignoring subscription error');
          return;
        }

        console.error('Failed to setup subscription:', error);
        setIsReady(false);
      }
    },
    async () => {
      const topicObj = Topic.fromString(topic);
      const hexTopic = topicObj.toString();
      const stateManager = ManifestStateManager.getInstance();

      try {
        await stateManager.clear(hexTopic);
        console.log('✅ Stream subscription cleanup complete');
      } catch (err) {
        console.error('❌ Error during stream subscription cleanup:', err);
      }
    },
    [owner, topic, channelManager],
  );

  useEffect(() => {
    retryCountRef.current = 0;
    setHasFatalError(false);
  }, [owner, topic]);

  useEffect(() => {
    if (!isReady) return;

    const video = videoRef.current;
    if (!video) return;

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

      hls.on(Events.MANIFEST_PARSED, () => {
        retryCountRef.current = 0;
        setHasFatalError(false);

        if (autoPlay) {
          video.play().catch((err) => {
            console.warn('Auto-play failed:', err);
          });
        }
      });
    } else {
      console.error('HLS is not supported in this browser.');
    }

    return () => {
      if (hls) {
        hls.destroy();
        hls = null;
      }
    };
  }, [isReady, autoPlay, restartTrigger, owner, topic]);

  if (!isReady) {
    return (
      <div className="swarm-hls-player-loading">
        <InputLoading />
        <h2>Initializing stream...</h2>
      </div>
    );
  }

  if (hasFatalError) {
    return (
      <div className="swarm-hls-player-error">
        <h2>Something went wrong!</h2>
        <p>The stream could not be loaded. Please try again later.</p>
      </div>
    );
  }

  return mediaType === MediaType.VIDEO ? (
    <video
      className="swarm-hls-player-video"
      ref={videoRef}
      controls={controls}
      autoPlay={autoPlay}
      muted
      playsInline
      {...videoProps}
    />
  ) : (
    <audio className="swarm-hls-player-audio" ref={videoRef} controls={controls} autoPlay={autoPlay} />
  );
};
