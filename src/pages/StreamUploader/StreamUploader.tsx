import { useState } from 'react';

import { BatchCard } from '@/components/StreamUploader/BatchCard';
import { JobsPanel } from '@/components/StreamUploader/JobsPanel';
import { SourcesTable } from '@/components/StreamUploader/SourcesTable';
import { useStreamUploader } from '@/hooks/useStreamUploader';
import { useUserContext } from '@/providers/User';

import './StreamUploader.scss';

export function StreamUploader() {
  const { session } = useUserContext();
  const { streams, batches, jobs, isLoading, error, notice, pending, archive, restore } = useStreamUploader(
    session?.serverKeys.nginx,
  );
  const [restoreAsExternal, setRestoreAsExternal] = useState(true);

  return (
    <div className="stream-uploader">
      <div className="stream-uploader-inner">
        <header className="stream-uploader-header">
          <h2>Stream uploader</h2>
          <p className="stream-uploader-subtitle">
            Archive copies a stream onto the archive stamp so it outlives the rotating slots. Restore puts an evicted
            stream back on the list as it was.
          </p>
        </header>

        {error && <div className="stream-uploader-error">{error}</div>}
        {notice && <div className="stream-uploader-notice">{notice}</div>}

        <div className="stream-uploader-batches">
          <BatchCard title="Archive stamp" batch={batches?.archive ?? null} note={batches ? null : 'Loading…'} />
          <BatchCard
            title="Chat stamp"
            batch={batches?.chat ?? null}
            note={batches?.chatError ?? (batches ? 'Not configured.' : 'Loading…')}
          />
        </div>

        <label className="stream-uploader-option">
          <input type="checkbox" checked={restoreAsExternal} onChange={(e) => setRestoreAsExternal(e.target.checked)} />
          Restore outside the rotating slots (external, like the tutorials)
        </label>

        {isLoading ? (
          <p className="stream-uploader-loading">Loading sources…</p>
        ) : (
          <SourcesTable
            streams={streams}
            archiveBatch={batches?.archive ?? null}
            pending={pending}
            restoreAsExternal={restoreAsExternal}
            onArchive={(topic) => void archive(topic)}
            onRestore={(topic) => void restore(topic, restoreAsExternal)}
          />
        )}

        <JobsPanel jobs={jobs} />
      </div>
    </div>
  );
}
