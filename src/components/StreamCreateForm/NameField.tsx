import './NameField.scss';

export function NameField({
  value,
  onChange,
  disabled = false,
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength: number;
}) {
  return (
    <div className="name-field">
      <label htmlFor="stream-name">Stream Name *</label>
      <input
        id="stream-name"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter your stream name"
        maxLength={maxLength}
        disabled={disabled}
        className="name-input"
      />
      <span className="name-char-count">
        {value.length}/{maxLength}
      </span>
    </div>
  );
}
