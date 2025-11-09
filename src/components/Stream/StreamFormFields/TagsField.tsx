import { KeyboardEvent, useState } from 'react';

import './TagsField.scss';

export function TagsField({
  value,
  onChange,
  disabled = false,
  maxTags = 10,
  maxTagLength = 20,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  maxTags?: number;
  maxTagLength?: number;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleAddTag = () => {
    const trimmedValue = inputValue.trim();

    if (!trimmedValue) return;

    if (value.length >= maxTags) {
      return;
    }

    if (value.includes(trimmedValue)) {
      setInputValue('');
      return;
    }

    onChange([...value, trimmedValue]);
    setInputValue('');
  };

  const handleRemoveTag = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="tags-field">
      <label htmlFor="stream-tags">Tags</label>

      <div className="tags-input-container">
        <input
          id="stream-tags"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={value.length >= maxTags ? `Maximum ${maxTags} tags reached` : 'Add a tag and press Enter'}
          maxLength={maxTagLength}
          disabled={disabled || value.length >= maxTags}
          className="tags-input"
        />
        <button
          type="button"
          className="tags-add-button"
          onClick={handleAddTag}
          disabled={disabled || !inputValue.trim() || value.length >= maxTags}
        >
          Add
        </button>
      </div>

      {value.length > 0 && (
        <div className="tags-list">
          {value.map((tag, index) => (
            <span key={index} className="tag-item">
              {tag}
              <button
                type="button"
                className="tag-remove"
                onClick={() => handleRemoveTag(index)}
                disabled={disabled}
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <span className="tags-count">
        {value.length}/{maxTags} tags
      </span>
    </div>
  );
}
