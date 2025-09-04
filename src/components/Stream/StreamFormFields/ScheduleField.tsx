import './ScheduleField.scss';

const dateToLocalString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getCurrentLocalString = (): string => {
  return dateToLocalString(new Date());
};

export function ScheduleField({
  value,
  onChange,
  disabled = false,
}: {
  value?: Date;
  onChange: (date?: Date) => void;
  disabled?: boolean;
}) {
  return (
    <div className="schedule-field">
      <label htmlFor="scheduled-time">Scheduled Start Time *</label>
      <input
        id="scheduled-time"
        type="datetime-local"
        value={value ? dateToLocalString(value) : ''}
        onChange={(e) => {
          const date = e.target.value ? new Date(e.target.value) : undefined;
          onChange(date);
        }}
        disabled={disabled}
        className="schedule-input"
        min={getCurrentLocalString()}
      />
    </div>
  );
}
