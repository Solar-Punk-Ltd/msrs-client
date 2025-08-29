import { MEDIA_TYPE_LABELS, MediaType } from '@/pages/StreamWatcher/StreamWatcher';

import './MediaTypeField.scss';

export function MediaTypeField({
  value,
  onChange,
  disabled = false,
}: {
  value: MediaType;
  onChange: (value: MediaType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="media-type-field">
      <label>Media Type</label>
      <div className="media-type-radio-group">
        <label className="media-type-radio">
          <input
            type="radio"
            value={MediaType.VIDEO}
            checked={value === MediaType.VIDEO}
            onChange={(e) => onChange(e.target.value as MediaType)}
            disabled={disabled}
          />
          {MEDIA_TYPE_LABELS[MediaType.VIDEO]}
        </label>
        <label className="media-type-radio">
          <input
            type="radio"
            value={MediaType.AUDIO}
            checked={value === MediaType.AUDIO}
            onChange={(e) => onChange(e.target.value as MediaType)}
            disabled={disabled}
          />
          {MEDIA_TYPE_LABELS[MediaType.AUDIO]}
        </label>
      </div>
    </div>
  );
}
