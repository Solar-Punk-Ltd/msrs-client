import { useMemo, useState } from 'react';

import { BatchCard } from '@/components/StreamUploader/BatchCard';
import { JobsPanel } from '@/components/StreamUploader/JobsPanel';
import { SourcesTable } from '@/components/StreamUploader/SourcesTable';
import { useStreamUploader } from '@/hooks/useStreamUploader';
import { useUserContext } from '@/providers/User';
import { diluteAdvice } from '@/utils/stamp/archiveSizing';

import './StreamUploader.scss';

export function StreamUploader() {
  const { session } = useUserContext();
  const { streams, batches, jobs, isLoading, error, measure, archive, restore } = useStreamUploader(
    session?.serverKeys.nginx,
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [restoreAsExternal, setRestoreAsExternal] = useState(true);

  const busy = jobs.some((j) => j.status === 'queued' || j.status === 'running');

  const selectedBytes = useMemo(
    () => streams.filter((s) => selected.has(s.topic)).reduce((sum, s) => sum + (s.size?.bytes ?? 0), 0),
    [streams, selected],
  );
  const advice = batches ? diluteAdvice(selectedBytes, batches.archive) : null;

  const toggle = (topic: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });

  return (
    <div className="stream-uploader">
      <div className="stream-uploader-inner">
        <header className="stream-uploader-header">
          <h2>Stream uploader</h2>
          <p className="stream-uploader-subtitle">
            Put a stream onto the archive stamp so it outlives the rotating slots, and bring evicted streams back onto
            the list as they were.
          </p>
        </header>

        {error && <div className="stream-uploader-error">{error}</div>}

        {batches && (
          <div className="stream-uploader-batches">
            <BatchCard title="Archive stamp" batch={batches.archive} selectedBytes={selectedBytes} advice={advice} />
            {batches.chat && <BatchCard title="Chat stamp" batch={batches.chat} />}
          </div>
        )}

        <div className="stream-uploader-options">
          <label className="stream-uploader-option">
            <input
              type="checkbox"
              checked={restoreAsExternal}
              onChange={(e) => setRestoreAsExternal(e.target.checked)}
            />
            Restore outside the rotating slots (external, like the tutorials)
          </label>
        </div>

        <div className="stream-uploader-content">
          {isLoading ? (
            <p className="stream-uploader-loading">Loading sources…</p>
          ) : (
            <SourcesTable
              streams={streams}
              selected={selected}
              onToggle={toggle}
              onMeasure={(topic) => void measure(topic)}
              onArchive={(topic) => void archive(topic)}
              onRestore={(topic) => void restore(topic, restoreAsExternal)}
              busy={busy}
            />
          )}
          <JobsPanel jobs={jobs} />
        </div>
      </div>
    </div>
  );
}
