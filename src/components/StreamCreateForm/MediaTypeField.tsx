import './MediaTypeField.scss';

export function MediaTypeField({
  value,
  onChange,
  disabled = false,
}: {
  value: 'video' | 'audio';
  onChange: (value: 'video' | 'audio') => void;
  disabled?: boolean;
}) {
  return (
    <div className="media-type-field">
      <label>Media Type</label>
      <div className="media-type-radio-group">
        <label className="media-type-radio">
          <input
            type="radio"
            value="video"
            checked={value === 'video'}
            onChange={(e) => onChange(e.target.value as 'video' | 'audio')}
            disabled={disabled}
          />
          Video Stream
        </label>
        <label className="media-type-radio">
          <input
            type="radio"
            value="audio"
            checked={value === 'audio'}
            onChange={(e) => onChange(e.target.value as 'video' | 'audio')}
            disabled={disabled}
          />
          Audio Only
        </label>
      </div>
    </div>
  );
}
