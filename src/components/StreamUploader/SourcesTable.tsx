import { useState } from 'react';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { SimpleModal } from '@/components/SimpleModal/SimpleModal';
import type { BatchInfo, UploaderStream } from '@/utils/network/uploaderService';
import { copyPercent, fitsInBatch, formatBytes, formatCount } from '@/utils/stamp/archiveSizing';

import './SourcesTable.scss';

interface SourcesTableProps {
  streams: UploaderStream[];
  archiveBatch: BatchInfo | null;
  /** Streams whose action was clicked and not yet reflected by the service. */
  pending: Set<string>;
  restoreAsExternal: boolean;
  onArchive: (topic: string) => void;
  onRestore: (topic: string) => void;
}

function streamDate(stream: UploaderStream): string {
  const t = stream.scheduledStartTime ? Date.parse(stream.scheduledStartTime) : stream.createdAt;
  if (!t) return '';
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function sizeLabel(stream: UploaderStream): string {
  if (stream.size) return `${formatBytes(stream.size.bytes)} · ${stream.size.segments} segments`;
  if (stream.sizeState === 'unavailable') return '—';
  return 'measuring…';
}

interface RowStatus {
  label: string;
  tone: 'ok' | 'busy' | 'muted' | 'warn';
  percent?: number | null;
}

export function rowStatus(stream: UploaderStream, isPending: boolean): RowStatus {
  const job = stream.activeJob;
  if (job?.type === 'restore') {
    return { label: job.phase === 'confirming' ? 'Restoring, waiting for the list' : 'Restoring…', tone: 'busy' };
  }
  if (job?.type === 'restamp') {
    if (job.status === 'queued') return { label: 'Archive queued', tone: 'busy' };
    const percent = copyPercent(job.progress, job.expectedChunks);
    return {
      label: percent === null ? `Archiving (${job.phase ?? 'starting'})` : `Archiving ${percent}%`,
      tone: 'busy',
      percent,
    };
  }
  if (isPending) return { label: 'Queued…', tone: 'busy' };
  if (stream.archived === 'complete') return { label: 'Archived', tone: 'ok' };
  if (stream.archived === 'partial')
    return { label: `Partly archived · ${formatCount(stream.chunksOnBatch)} chunks`, tone: 'warn' };
  return { label: 'Not archived', tone: 'muted' };
}

export function SourcesTable({
  streams,
  archiveBatch,
  pending,
  restoreAsExternal,
  onArchive,
  onRestore,
}: SourcesTableProps) {
  const [confirmTopic, setConfirmTopic] = useState<string | null>(null);
  const confirming = confirmTopic ? streams.find((s) => s.topic === confirmTopic) : undefined;

  const archiveBlocker = (stream: UploaderStream): string | null => {
    if (!archiveBatch || !stream.size) return null;
    return fitsInBatch(stream.size.bytes, archiveBatch)
      ? null
      : `Needs ${formatBytes(stream.size.bytes)}, ${formatBytes(
          archiveBatch.freeBytes,
        )} free. Dilute the archive stamp first.`;
  };

  return (
    <>
      <table className="sources-table">
        <thead>
          <tr>
            <th>Stream</th>
            <th>Date</th>
            <th>Size</th>
            <th>Status</th>
            <th aria-label="actions" />
          </tr>
        </thead>
        <tbody>
          {streams.map((stream) => {
            const isPending = pending.has(stream.topic);
            const status = rowStatus(stream, isPending);
            const busy = isPending || Boolean(stream.activeJob);
            const blocker = archiveBlocker(stream);
            return (
              <tr key={`${stream.owner}-${stream.topic}`} className={stream.listed ? '' : 'sources-table-row--offlist'}>
                <td className="sources-table-title">
                  {stream.title.trim()}
                  {!stream.listed && <span className="sources-table-badge sources-table-badge--warn">evicted</span>}
                  {stream.isExternal && <span className="sources-table-badge">external</span>}
                </td>
                <td>{streamDate(stream)}</td>
                <td className="sources-table-size">{sizeLabel(stream)}</td>
                <td className={`sources-table-status sources-table-status--${status.tone}`}>
                  {status.label}
                  {status.percent !== undefined && status.percent !== null && (
                    <div
                      className="sources-table-bar"
                      role="progressbar"
                      aria-valuenow={status.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div className="sources-table-bar-fill" style={{ width: `${status.percent}%` }} />
                    </div>
                  )}
                </td>
                <td className="sources-table-actions">
                  {!busy && stream.archived !== 'complete' && (
                    <button
                      className="sources-table-action"
                      onClick={() => onArchive(stream.topic)}
                      disabled={Boolean(blocker)}
                      title={blocker ?? 'Copy this stream onto the archive stamp'}
                    >
                      Archive
                    </button>
                  )}
                  {!busy && !stream.listed && (
                    <button
                      className="sources-table-action sources-table-action--primary"
                      onClick={() => setConfirmTopic(stream.topic)}
                      title="Put this stream back on the list"
                    >
                      Restore
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <SimpleModal
        isOpen={Boolean(confirming)}
        title="Restore to the list"
        closeText="Cancel"
        onClose={() => setConfirmTopic(null)}
      >
        {confirming && (
          <div className="sources-table-confirm">
            <p>
              Put <strong>{confirming.title.trim()}</strong> back on the list
              {restoreAsExternal
                ? ', outside the rotating slots (external, like the tutorials)'
                : ', in the rotating slots'}
              ? It reappears with its original title, date, thumbnail and chat.
            </p>
            {confirming.archived !== 'complete' && (
              <p className="sources-table-confirm-warn">
                This recording is not fully on the archive stamp yet. Restoring works, but archive it too.
              </p>
            )}
            <Button
              variant={ButtonVariant.PRIMARY}
              onClick={() => {
                onRestore(confirming.topic);
                setConfirmTopic(null);
              }}
            >
              Restore now
            </Button>
          </div>
        )}
      </SimpleModal>
    </>
  );
}
