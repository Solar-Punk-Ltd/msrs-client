import './StreamPreview.scss';

interface StreamPreviewProps {
  title: string;
  description: string;
  scheduledStartTime: string;
}

export function StreamPreview({ title, description, scheduledStartTime }: StreamPreviewProps) {
  return (
    <div className="stream-item-preview">
      <div className="stream-preview-header">
        <h1 className="stream-preview-title">{title}</h1>
      </div>

      <div className="stream-preview-content">
        <div className="stream-preview-description">
          <h3>Description</h3>
          <p>{description}</p>
        </div>

        <div className="stream-preview-schedule">
          <h3>Scheduled Start</h3>
          <p>{new Date(scheduledStartTime).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
