import { useEffect, useState } from 'react';

import { MediaType, StateType } from '@/types/stream';

import { thumbnailCache } from '../StreamThumbnail/thumbnailCache';

import './ScheduledPlaceholder.scss';

interface ScheduledPlaceholderProps {
  title: string;
  thumbnailRef?: string;
  owner: string;
  topic: string;
  mediaType: MediaType;
  scheduledStartTime?: string;
}

function startLabel(iso?: string): { relative: string; absolute: string } | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const diff = t - Date.now();
  let relative: string;
  if (diff <= 0) relative = 'Starting soon';
  else {
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    if (days > 0) relative = `Live in ${days} day${days === 1 ? '' : 's'}`;
    else if (hours > 0) relative = `Live in ${hours} hour${hours === 1 ? '' : 's'}`;
    else relative = `Live in ${Math.max(minutes, 1)} minute${minutes === 1 ? '' : 's'}`;
  }
  const absolute = new Date(t).toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return { relative, absolute };
}

export function ScheduledPlaceholder({
  title,
  thumbnailRef,
  owner,
  topic,
  mediaType,
  scheduledStartTime,
}: ScheduledPlaceholderProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    thumbnailCache
      .getThumbnail({ manifestUrl: '', thumbnailRef, owner, topic, mediaType, state: StateType.SCHEDULED })
      .then((url) => mounted && setThumbnailUrl(url))
      .catch(() => mounted && setThumbnailUrl(null));
    return () => {
      mounted = false;
    };
  }, [thumbnailRef, owner, topic, mediaType]);

  const label = startLabel(scheduledStartTime);

  return (
    <div className="scheduled-placeholder">
      {thumbnailUrl && (
        <>
          <img className="scheduled-placeholder-backdrop" src={thumbnailUrl} alt="" aria-hidden="true" />
          <img className="scheduled-placeholder-image" src={thumbnailUrl} alt={title} />
        </>
      )}
      {label && (
        <div className="scheduled-placeholder-overlay">
          <span className="scheduled-placeholder-relative">{label.relative}</span>
          <span className="scheduled-placeholder-absolute">{label.absolute}</span>
        </div>
      )}
    </div>
  );
}
