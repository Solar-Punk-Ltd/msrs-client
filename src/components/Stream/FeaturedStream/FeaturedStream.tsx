import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { StateEntry, StateType } from '@/types/stream';

import { StreamThumbnail } from '../StreamThumbnail/StreamThumbnail';
import { SwarmHlsPlayer } from '../SwarmHlsPlayer/SwarmHlsPlayer';

import './FeaturedStream.scss';

interface FeaturedStreamProps {
  stream: StateEntry;
  thumbnailRef?: string;
  manifestUrl: string;
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  startingSoon: boolean;
}

function useCountdown(target: number | null): Countdown | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;
  const diff = target - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, startingSoon: true };
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    startingSoon: false,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

function parseStartTime(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t;
}

export function FeaturedStream({ stream, thumbnailRef, manifestUrl }: FeaturedStreamProps) {
  const navigate = useNavigate();
  const isLive = stream.state === StateType.LIVE;
  const mediaRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(true);

  // Pause the inline live player's bandwidth use when the banner is scrolled out of view:
  // unmounting tears down the HLS session entirely.
  useEffect(() => {
    if (!isLive || !mediaRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(mediaRef.current);
    return () => observer.disconnect();
  }, [isLive]);
  const startTime = parseStartTime(stream.scheduledStartTime);
  const countdown = useCountdown(isLive ? null : startTime);

  const dateLabel = startTime
    ? new Date(startTime).toLocaleString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="featured-stream">
      <div className="featured-stream-body">
        <span className={`featured-stream-badge ${isLive ? 'featured-stream-badge--live' : ''}`}>
          {isLive ? 'Live' : 'Upcoming'}
        </span>
        {!isLive && dateLabel && <p className="featured-stream-date">{dateLabel}</p>}
        <h2 className="featured-stream-title">{stream.title}</h2>
        {stream.description && <p className="featured-stream-description">{stream.description}</p>}

        {countdown && !countdown.startingSoon && (
          <div className="featured-stream-countdown-wrap">
            <p className="featured-stream-starts-in">Starts in</p>
            <div className="featured-stream-countdown">
              <div className="featured-stream-countdown-block">
                <span className="featured-stream-countdown-number">{pad(countdown.days)}</span>
                <span className="featured-stream-countdown-label">Days</span>
              </div>
              <div className="featured-stream-countdown-divider" />
              <div className="featured-stream-countdown-block">
                <span className="featured-stream-countdown-number">{pad(countdown.hours)}</span>
                <span className="featured-stream-countdown-label">Hours</span>
              </div>
              <div className="featured-stream-countdown-divider" />
              <div className="featured-stream-countdown-block">
                <span className="featured-stream-countdown-number">{pad(countdown.minutes)}</span>
                <span className="featured-stream-countdown-label">Minutes</span>
              </div>
            </div>
          </div>
        )}
        {countdown?.startingSoon && <p className="featured-stream-starts-in">Starting soon</p>}
        {isLive && <p className="featured-stream-live-note">Streaming now over the Swarm network</p>}
      </div>

      <div className="featured-stream-media" ref={mediaRef}>
        {isLive && isInView ? (
          <div className="featured-stream-player">
            <SwarmHlsPlayer
              owner={stream.owner}
              topic={stream.topic}
              mediaType={stream.mediaType}
              streamState={stream.state}
              isExternal={stream.isExternal}
              manifestIndex={stream.index}
            />
          </div>
        ) : (
          <StreamThumbnail
            title={stream.title}
            thumbnailRef={thumbnailRef}
            manifestUrl={manifestUrl}
            owner={stream.owner}
            topic={stream.topic}
            state={stream.state}
            duration={stream.duration}
            mediaType={stream.mediaType}
            pinned={stream.pinned}
          />
        )}
        <button
          type="button"
          className={`watch-on-swarm-button ${isLive ? 'watch-on-swarm-button--live' : ''}`}
          onClick={() => navigate(`/watch/${stream.mediaType}/${stream.owner}/${stream.topic}`)}
        >
          {isLive || stream.state === StateType.SCHEDULED ? <>Join stream &amp; chat &rarr;</> : <>Watch on Swarm &rarr;</>}
        </button>
      </div>
    </div>
  );
}
