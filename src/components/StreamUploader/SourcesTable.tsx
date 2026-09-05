import type { UploaderStream } from '@/utils/network/uploaderService';
import { archivedShare, formatBytes } from '@/utils/stamp/archiveSizing';

import './SourcesTable.scss';

interface SourcesTableProps {
  streams: UploaderStream[];
  selected: Set<string>;
  onToggle: (topic: string) => void;
  onMeasure: (topic: string) => void;
  onArchive: (topic: string) => void;
  onRestore: (topic: string) => void;
  busy: boolean;
}

function streamDate(stream: UploaderStream): string {
  const t = stream.scheduledStartTime ? Date.parse(stream.scheduledStartTime) : stream.createdAt;
  if (!t) return '';
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function archivedLabel(stream: UploaderStream): string {
  const share = archivedShare(stream.chunksOnBatch, stream.size?.chunks);
  if (share === null) return stream.chunksOnBatch > 0 ? `${stream.chunksOnBatch} chunks` : 'not started';
  if (share >= 1) return 'complete';
  return `${Math.round(share * 100)}%`;
}

export function SourcesTable({
  streams,
  selected,
  onToggle,
  onMeasure,
  onArchive,
  onRestore,
  busy,
}: SourcesTableProps) {
  return (
    <div className="sources-table-wrap">
      <table className="sources-table">
        <thead>
          <tr>
            <th aria-label="select" />
            <th>Stream</th>
            <th>Date</th>
            <th>On list</th>
            <th>Size</th>
            <th>Archived</th>
            <th aria-label="actions" />
          </tr>
        </thead>
        <tbody>
          {streams.map((stream) => (
            <tr key={`${stream.owner}-${stream.topic}`} className={stream.listed ? '' : 'sources-table-row--offlist'}>
              <td>
                <input
                  type="checkbox"
                  aria-label={`Select ${stream.title}`}
                  checked={selected.has(stream.topic)}
                  onChange={() => onToggle(stream.topic)}
                  disabled={!stream.size}
                />
              </td>
              <td className="sources-table-title">
                {stream.title.trim()}
                {stream.isExternal && <span className="sources-table-badge">external</span>}
              </td>
              <td>{streamDate(stream)}</td>
              <td>
                {stream.listed ? 'yes' : <span className="sources-table-badge sources-table-badge--warn">evicted</span>}
              </td>
              <td>
                {stream.size ? (
                  `${formatBytes(stream.size.bytes)} · ${stream.size.segments} seg`
                ) : (
                  <button className="sources-table-action" onClick={() => onMeasure(stream.topic)} disabled={busy}>
                    Measure
                  </button>
                )}
              </td>
              <td>{archivedLabel(stream)}</td>
              <td className="sources-table-actions">
                <button className="sources-table-action" onClick={() => onArchive(stream.topic)} disabled={busy}>
                  Archive
                </button>
                {!stream.listed && (
                  <button
                    className="sources-table-action sources-table-action--primary"
                    onClick={() => onRestore(stream.topic)}
                    disabled={busy}
                  >
                    Restore
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
