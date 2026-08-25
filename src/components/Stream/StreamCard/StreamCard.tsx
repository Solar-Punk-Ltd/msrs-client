import { useNavigate } from 'react-router-dom';

import { StateEntry, StateType } from '@/types/stream';

import { StreamThumbnail } from '../StreamThumbnail/StreamThumbnail';

import './StreamCard.scss';

interface StreamCardProps {
  stream: StateEntry;
  thumbnailRef?: string;
  manifestUrl: string;
}

function cardLabel(stream: StateEntry): string {
  if (stream.state === StateType.LIVE) return 'Live';
  if (stream.state === StateType.SCHEDULED) return 'Upcoming';
  return 'Recording';
}

function cardDate(stream: StateEntry): string | null {
  const t = stream.scheduledStartTime ? Date.parse(stream.scheduledStartTime) : stream.createdAt;
  if (!t || Number.isNaN(t)) return null;
  // upcoming streams show the start time too; past ones just the date
  if (stream.state === StateType.SCHEDULED) {
    return new Date(t).toLocaleString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return new Date(t).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

interface DescriptionParts {
  paragraphs: string[];
  bullets: string[];
}

function parseDescription(description?: string): DescriptionParts {
  const paragraphs: string[] = [];
  const bullets: string[] = [];
  if (!description) return { paragraphs, bullets };
  for (const raw of description.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('- ')) bullets.push(line.slice(2).trim());
    else paragraphs.push(line);
  }
  return { paragraphs, bullets };
}

// "Core Development Updates: Bee 2.8.2" -> bold lead before the separator
function renderBullet(text: string) {
  const match = text.match(/^(.+?)([:—])\s*(.+)$/);
  if (!match) return <span>{text}</span>;
  return (
    <span>
      <strong>
        {match[1]}
        {match[2] === ':' ? ':' : ' —'}
      </strong>{' '}
      {match[3]}
    </span>
  );
}

export function StreamCard({ stream, thumbnailRef, manifestUrl }: StreamCardProps) {
  const navigate = useNavigate();
  const label = cardLabel(stream);
  const date = cardDate(stream);
  const { paragraphs, bullets } = parseDescription(stream.description);

  return (
    <div className="stream-card">
      <div className="stream-card-header">
        <span className="stream-card-label">{label}</span>
        {date && <span className="stream-card-date">{date}</span>}
      </div>

      <h3 className="stream-card-title">{stream.title}</h3>

      <div className="stream-card-media">
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
        <button
          type="button"
          className="watch-on-swarm-button"
          onClick={() => navigate(`/watch/${stream.mediaType}/${stream.owner}/${stream.topic}`)}
        >
          {stream.state === StateType.VOD ? <>Watch on Swarm &rarr;</> : <>Join stream &amp; chat &rarr;</>}
        </button>
      </div>

      {(paragraphs.length > 0 || bullets.length > 0) && (
        <div className="stream-card-description">
          {paragraphs.map((p, i) => (
            <p key={`p-${i}`}>{p}</p>
          ))}
          {bullets.length > 0 && (
            <ul className="stream-card-agenda">
              {bullets.map((b, i) => (
                <li key={`b-${i}`}>{renderBullet(b)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
