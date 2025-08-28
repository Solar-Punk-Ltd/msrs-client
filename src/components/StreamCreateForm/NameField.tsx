import { LIMITS } from '@/pages/StreamCreate/StreamCreate';

import './NameField.scss';

export function NameField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="name-field">
      <label htmlFor="stream-name">Stream Name</label>
      <input
        id="stream-name"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your stream name"
        maxLength={LIMITS.NAME_MAX_LENGTH}
        disabled={disabled}
        className="name-input"
      />
      <span className="name-char-count">
        {value.length}/{LIMITS.NAME_MAX_LENGTH}
      </span>
    </div>
  );
}
