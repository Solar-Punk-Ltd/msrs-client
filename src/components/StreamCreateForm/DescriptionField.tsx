import { LIMITS } from '@/pages/StreamCreate/StreamCreate';

import './DescriptionField.scss';

export function DescriptionField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="description-field">
      <label htmlFor="stream-description">Description</label>
      <textarea
        id="stream-description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe your stream..."
        maxLength={LIMITS.DESCRIPTION_MAX_LENGTH}
        disabled={disabled}
        className="description-textarea"
        rows={4}
      />
      <span className="description-char-count">
        {value.length}/{LIMITS.DESCRIPTION_MAX_LENGTH}
      </span>
    </div>
  );
}
