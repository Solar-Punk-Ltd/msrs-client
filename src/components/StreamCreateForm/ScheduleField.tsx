import './ScheduleField.scss';

export function ScheduleField({
  value,
  onChange,
  disabled,
}: {
  value?: Date;
  onChange: (date?: Date) => void;
  disabled: boolean;
}) {
  return (
    <div className="schedule-field">
      <label htmlFor="scheduled-time">Scheduled Start Time</label>
      <input
        id="scheduled-time"
        type="datetime-local"
        value={value?.toISOString().slice(0, 16) || ''}
        onChange={(e) => {
          const date = e.target.value ? new Date(e.target.value) : undefined;
          onChange(date);
        }}
        disabled={disabled}
        className="schedule-input"
        min={new Date().toISOString().slice(0, 16)}
      />
    </div>
  );
}
