import './PreviewField.scss';

interface PreviewFieldProps {
  label: string;
  value: string;
  file?: File;
  type?: 'text' | 'thumbnail';
}

export function PreviewField({ label, value, file, type = 'text' }: PreviewFieldProps) {
  return (
    <div className="preview-field">
      <label>{label}</label>
      {type === 'thumbnail' && file ? (
        <div className="preview-thumbnail">
          <img src={URL.createObjectURL(file)} alt="Thumbnail preview" />
        </div>
      ) : (
        <div className="preview-value">{value}</div>
      )}
    </div>
  );
}
