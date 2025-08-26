import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { ROUTES } from '@/routes';

import './StreamCreate.scss';

interface StreamMetadata {
  name: string;
  description: string;
  thumbnail: File | null;
  mediaType: 'video' | 'audio';
  scheduledStartTime?: Date;
}

export function StreamCreate() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<StreamMetadata>({
    name: '',
    description: '',
    thumbnail: null,
    mediaType: 'video',
    scheduledStartTime: undefined,
  });

  const handleInputChange = (field: keyof StreamMetadata, value: any) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
  };

  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        setError('Thumbnail file size must be less than 5MB');
        return;
      }

      setMetadata((prev) => ({ ...prev, thumbnail: file }));
    }
  };

  const handleBackButtonClick = () => {
    navigate(ROUTES.STREAM_BROWSER);
  };

  const handleCreateStream = async () => {
    setError(null);

    // Validation
    if (!metadata.name.trim()) {
      setError('Stream name is required');
      return;
    }

    if (metadata.name.length > 100) {
      setError('Stream name must be less than 100 characters');
      return;
    }

    if (metadata.description.length > 500) {
      setError('Description must be less than 500 characters');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement stream creation logic
      console.log('Creating stream with metadata:', metadata);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Navigate back to browser or to the new stream
      navigate(ROUTES.STREAM_BROWSER);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create stream');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="stream-create">
      <div className="stream-create-form">
        {error && <div className="stream-create-error">{error}</div>}

        <div className="stream-create-section">
          <div className="stream-create-field">
            <label htmlFor="stream-name">Stream Name</label>
            <input
              id="stream-name"
              type="text"
              value={metadata.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter your stream name"
              maxLength={100}
              disabled={isLoading}
              className="stream-create-input"
            />
            <span className="stream-create-char-count">{metadata.name.length}/100</span>
          </div>

          <div className="stream-create-field">
            <label htmlFor="stream-description">Description</label>
            <textarea
              id="stream-description"
              value={metadata.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your stream..."
              maxLength={500}
              disabled={isLoading}
              className="stream-create-textarea"
              rows={4}
            />
            <span className="stream-create-char-count">{metadata.description.length}/500</span>
          </div>

          <div className="stream-create-field">
            <label>Media Type</label>
            <div className="stream-create-radio-group">
              <label className="stream-create-radio">
                <input
                  type="radio"
                  value="video"
                  checked={metadata.mediaType === 'video'}
                  onChange={(e) => handleInputChange('mediaType', e.target.value)}
                  disabled={isLoading}
                />
                Video Stream
              </label>
              <label className="stream-create-radio">
                <input
                  type="radio"
                  value="audio"
                  checked={metadata.mediaType === 'audio'}
                  onChange={(e) => handleInputChange('mediaType', e.target.value)}
                  disabled={isLoading}
                />
                Audio Only
              </label>
            </div>
          </div>
        </div>

        <div className="stream-create-section">
          <div className="stream-create-field">
            <label htmlFor="stream-thumbnail">Upload Thumbnail (Max 5MB)</label>
            <input
              id="stream-thumbnail"
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              disabled={isLoading}
              className="stream-create-file-input"
            />
          </div>
        </div>

        <div className="stream-create-section">
          <div className="stream-create-field">
            <label htmlFor="scheduled-time">Scheduled Start Time</label>
            <input
              id="scheduled-time"
              type="datetime-local"
              value={metadata.scheduledStartTime?.toISOString().slice(0, 16) || ''}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : undefined;
                handleInputChange('scheduledStartTime', date);
              }}
              disabled={isLoading}
              className="stream-create-input"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>
        </div>

        <div className="stream-create-actions">
          <Button
            variant={ButtonVariant.SECONDARY}
            onClick={handleBackButtonClick}
            disabled={isLoading}
            className="stream-create-cancel-button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateStream}
            disabled={isLoading || !metadata.name.trim()}
            className="stream-create-submit-button"
          >
            {isLoading ? 'Creating Stream...' : 'Create Stream'}
          </Button>
        </div>
      </div>
    </div>
  );
}
