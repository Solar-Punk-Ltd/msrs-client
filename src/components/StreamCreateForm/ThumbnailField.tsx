import { ERROR_MESSAGES, LIMITS } from '@/pages/StreamCreate/StreamCreate';

import './ThumbnailField.scss';

export function ThumbnailField({
  onChange,
  disabled,
  onError,
}: {
  onChange: (file: File) => void;
  disabled: boolean;
  onError: (error: string) => void;
}) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > LIMITS.THUMBNAIL_MAX_SIZE) {
        onError(ERROR_MESSAGES.THUMBNAIL_TOO_LARGE);
        return;
      }
      onChange(file);
    }
  };

  return (
    <div className="thumbnail-field">
      <label htmlFor="stream-thumbnail">Upload Thumbnail (Max 5MB)</label>
      <input
        id="stream-thumbnail"
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={disabled}
        className="thumbnail-file-input"
      />
    </div>
  );
}
