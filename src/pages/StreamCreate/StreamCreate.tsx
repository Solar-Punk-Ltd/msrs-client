import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { DescriptionField } from '@/components/StreamCreateForm/DescriptionField';
import { ErrorMessage } from '@/components/StreamCreateForm/ErrorMessage';
import { MediaTypeField } from '@/components/StreamCreateForm/MediaTypeField';
import { NameField } from '@/components/StreamCreateForm/NameField';
import { PreviewField } from '@/components/StreamCreateForm/PreviewField';
import { ScheduleField } from '@/components/StreamCreateForm/ScheduleField';
import { ThumbnailField } from '@/components/StreamCreateForm/ThumbnailField';
import { useStreamForm } from '@/hooks/useStreamCreateForm';
import { ROUTES } from '@/routes';

import './StreamCreate.scss';

export const LIMITS = {
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  THUMBNAIL_MAX_SIZE: 5 * 1024 * 1024, // 5MB
};

export const ERROR_MESSAGES = {
  NAME_REQUIRED: 'Stream name is required',
  NAME_TOO_LONG: `Stream name must be less than ${LIMITS.NAME_MAX_LENGTH} characters`,
  DESCRIPTION_REQUIRED: 'Description is required',
  DESCRIPTION_TOO_LONG: `Description must be less than ${LIMITS.DESCRIPTION_MAX_LENGTH} characters`,
  THUMBNAIL_REQUIRED: 'Thumbnail is required',
  THUMBNAIL_TOO_LARGE: 'Thumbnail file size must be less than 5MB',
  SCHEDULED_TIME_REQUIRED: 'Scheduled start time is required',
};

export interface StreamMetadata {
  name: string;
  description: string;
  thumbnail: File | null;
  mediaType: 'video' | 'audio';
  scheduledStartTime?: Date;
}

function StreamPreview({
  metadata,
  error,
  isLoading,
  onBack,
  onConfirm,
}: {
  metadata: StreamMetadata;
  error: string | null;
  isLoading: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="stream-create-preview">
      <ErrorMessage error={error} />

      <div className="stream-create-preview-header">
        <h2>Stream Meta Preview</h2>
      </div>

      <div className="stream-create-preview-content">
        <PreviewField label="Stream Name" value={metadata.name} />
        <PreviewField label="Description" value={metadata.description} type="description" />
        <PreviewField label="Media Type" value={metadata.mediaType === 'video' ? 'Video Stream' : 'Audio Stream'} />

        {metadata.thumbnail && (
          <PreviewField label="Thumbnail" value={metadata.thumbnail.name} file={metadata.thumbnail} type="thumbnail" />
        )}

        {metadata.scheduledStartTime && (
          <PreviewField label="Scheduled Start Time" value={metadata.scheduledStartTime.toLocaleString()} />
        )}
      </div>

      <div className="stream-create-actions">
        <Button
          variant={ButtonVariant.SECONDARY}
          onClick={onBack}
          disabled={isLoading}
          className="stream-create-cancel-button"
        >
          Back to Edit
        </Button>
        <Button onClick={onConfirm} disabled={isLoading} className="stream-create-submit-button">
          {isLoading ? 'Creating Stream...' : 'Create Stream'}
        </Button>
      </div>
    </div>
  );
}

function StreamForm({
  metadata,
  error,
  onFieldChange,
  onCancel,
  onPreview,
  onError,
}: {
  metadata: StreamMetadata;
  error: string | null;
  onFieldChange: (field: keyof StreamMetadata, value: any) => void;
  onCancel: () => void;
  onPreview: () => void;
  onError: (error: string) => void;
}) {
  return (
    <div className="stream-create-form">
      <ErrorMessage error={error} />

      <div className="stream-create-section">
        <NameField
          value={metadata.name}
          onChange={(value) => onFieldChange('name', value)}
          maxLength={LIMITS.NAME_MAX_LENGTH}
        />

        <DescriptionField
          value={metadata.description}
          onChange={(value) => onFieldChange('description', value)}
          maxLength={LIMITS.DESCRIPTION_MAX_LENGTH}
        />

        <MediaTypeField value={metadata.mediaType} onChange={(value) => onFieldChange('mediaType', value)} />
      </div>

      <div className="stream-create-section">
        <ThumbnailField
          onChange={(file) => onFieldChange('thumbnail', file)}
          onError={onError}
          maxSize={LIMITS.THUMBNAIL_MAX_SIZE}
          errorMessage={ERROR_MESSAGES.THUMBNAIL_TOO_LARGE}
        />
      </div>

      <div className="stream-create-section">
        <ScheduleField
          value={metadata.scheduledStartTime}
          onChange={(date) => onFieldChange('scheduledStartTime', date)}
        />
      </div>

      <div className="stream-create-actions">
        <Button variant={ButtonVariant.SECONDARY} onClick={onCancel} className="stream-create-cancel-button">
          Cancel
        </Button>
        <Button onClick={onPreview} className="stream-create-submit-button">
          Preview
        </Button>
      </div>
    </div>
  );
}

export function StreamCreate() {
  const navigate = useNavigate();
  const { metadata, updateField, validateForm } = useStreamForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const handleCancel = () => {
    navigate(ROUTES.STREAM_BROWSER);
  };

  const handlePreview = () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setIsPreviewMode(true);
  };

  const handleBackToEdit = () => {
    setIsPreviewMode(false);
  };

  const handleCreateStream = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // TODO: Implement stream creation logic
      console.log('Creating stream with metadata:', metadata);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      navigate(ROUTES.STREAM_BROWSER);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create stream');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="stream-create">
      {isPreviewMode ? (
        <StreamPreview
          metadata={metadata}
          error={error}
          isLoading={isLoading}
          onBack={handleBackToEdit}
          onConfirm={handleCreateStream}
        />
      ) : (
        <StreamForm
          metadata={metadata}
          error={error}
          onFieldChange={updateField}
          onCancel={handleCancel}
          onPreview={handlePreview}
          onError={setError}
        />
      )}
    </div>
  );
}
