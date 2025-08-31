import './DescriptionField.scss';

export function DescriptionField({
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
    <div className="description-field">
      <label htmlFor="stream-description">Description *</label>
      <textarea
        id="stream-description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Describe your stream..."
        maxLength={maxLength}
        disabled={disabled}
        className="description-textarea"
        rows={4}
      />
      <span className="description-char-count">
        {value.length}/{maxLength}
      </span>
    </div>
  );
}
