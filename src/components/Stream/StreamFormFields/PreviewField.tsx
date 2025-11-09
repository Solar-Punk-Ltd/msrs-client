import './PreviewField.scss';

interface PreviewFieldProps {
  label: string;
  value: string | string[];
  file?: File;
  type?: 'text' | 'thumbnail' | 'description' | 'tags';
}

export function PreviewField({ label, value, file, type = 'text' }: PreviewFieldProps) {
  return (
    <div className="preview-field">
      <label>{label}</label>
      {type === 'thumbnail' && file ? (
        <div className="preview-thumbnail">
          <img src={URL.createObjectURL(file)} alt="Thumbnail preview" />
        </div>
      ) : type === 'tags' && Array.isArray(value) ? (
        <div className="preview-tags">
          {value.map((tag, index) => (
            <span key={index} className="preview-tag">
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <div className={`preview-value${type === 'description' ? ' description' : ''}`}>{value as string}</div>
      )}
    </div>
  );
}
