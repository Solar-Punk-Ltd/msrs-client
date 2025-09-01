import { useEffect, useRef } from 'react';

import './ThumbnailField.scss';

export function ThumbnailField({
  onChange,
  onError,
  maxSize,
  errorMessage,
  currThumbnail,
  disabled = false,
}: {
  onChange: (file: File) => void;
  disabled?: boolean;
  onError: (error: string) => void;
  maxSize: number;
  errorMessage: string;
  currThumbnail?: string | File | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currThumbnail instanceof File && inputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(currThumbnail);
      inputRef.current.files = dataTransfer.files;
    }
  }, [currThumbnail]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > maxSize) {
        onError(errorMessage);
        return;
      }
      onChange(file);
    }
  };

  return (
    <div className="thumbnail-field">
      <label htmlFor="stream-thumbnail">Upload Thumbnail * (Max 5MB)</label>
      <input
        ref={inputRef}
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
