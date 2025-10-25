import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { InputLoading } from '@/components/InputLoading/InputLoading';
import {
  DescriptionField,
  ErrorMessage,
  MediaTypeField,
  NameField,
  PreviewField,
  ScheduleField,
  ThumbnailField,
} from '@/components/Stream/StreamFormFields';
import { useStreamForm } from '@/hooks/useStreamForm';
import { useAppContext } from '@/providers/App/App';
import { useUserContext } from '@/providers/User';
import { ROUTES } from '@/routes';
import { MEDIA_TYPE_LABELS, MediaType } from '@/types/stream';
import { createStream, updateStream } from '@/utils/stream/stream';

import './StreamForm.scss';

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
  title: string;
  description: string;
  thumbnail: File | string | null;
  mediaType: MediaType;
  scheduledStartTime?: string;
}

function StreamMetadataPreview({
  metadata,
  error,
  isLoading,
  isEditMode,
  onBack,
  onConfirm,
}: {
  metadata: StreamMetadata;
  error: string | null;
  isLoading: boolean;
  isEditMode?: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="stream-form-preview">
      <div className="stream-form-preview-header">
        <h2>{isEditMode ? 'Edit Stream Preview' : 'Stream Meta Preview'}</h2>
      </div>

      <div className="stream-form-preview-content">
        <ErrorMessage error={error} />

        <PreviewField label="Stream Title" value={metadata.title} />
        <PreviewField label="Description" value={metadata.description} type="description" />
        <PreviewField label="Media Type" value={MEDIA_TYPE_LABELS[metadata.mediaType]} />

        {metadata.thumbnail && (
          <PreviewField
            label="Thumbnail"
            value={typeof metadata.thumbnail === 'string' ? metadata.thumbnail : metadata.thumbnail.name}
            file={typeof metadata.thumbnail === 'string' ? undefined : metadata.thumbnail}
            type="thumbnail"
          />
        )}

        {metadata.scheduledStartTime && (
          <PreviewField label="Scheduled Start Time" value={new Date(metadata.scheduledStartTime).toLocaleString()} />
        )}
      </div>

      <div className="stream-form-actions">
        <Button onClick={onConfirm} disabled={isLoading} className="stream-form-submit-button">
          {isLoading
            ? `${isEditMode ? 'Updating' : 'Creating'} Stream...`
            : `${isEditMode ? 'Update' : 'Create'} Stream`}
        </Button>
        <Button
          variant={ButtonVariant.SECONDARY}
          onClick={onBack}
          disabled={isLoading}
          className="stream-form-cancel-button"
        >
          Back to Edit
        </Button>
      </div>
    </div>
  );
}

function StreamEditForm({
  metadata,
  error,
  onFieldChange,
  onCancel,
  onPreview,
  onError,
  isInitializing,
}: {
  metadata: StreamMetadata;
  error: string | null;
  onFieldChange: (field: keyof StreamMetadata, value: any) => void;
  onCancel: () => void;
  onPreview: () => void;
  onError: (error: string) => void;
  isInitializing: boolean;
}) {
  if (isInitializing) {
    return <InputLoading />;
  }

  return (
    <div className="stream-form-form">
      <div className="stream-form-content">
        <ErrorMessage error={error} />

        <div className="stream-form-section">
          <NameField
            value={metadata.title}
            onChange={(value) => onFieldChange('title', value)}
            maxLength={LIMITS.NAME_MAX_LENGTH}
          />

          <DescriptionField
            value={metadata.description}
            onChange={(value) => onFieldChange('description', value)}
            maxLength={LIMITS.DESCRIPTION_MAX_LENGTH}
          />

          <MediaTypeField value={metadata.mediaType} onChange={(value) => onFieldChange('mediaType', value)} />
        </div>

        <div className="stream-form-section">
          <ThumbnailField
            onChange={(file) => onFieldChange('thumbnail', file)}
            onError={onError}
            maxSize={LIMITS.THUMBNAIL_MAX_SIZE}
            errorMessage={ERROR_MESSAGES.THUMBNAIL_TOO_LARGE}
            currThumbnail={metadata.thumbnail}
          />
        </div>

        <div className="stream-form-section">
          <ScheduleField
            value={metadata.scheduledStartTime ? new Date(metadata.scheduledStartTime) : undefined}
            onChange={(date) => onFieldChange('scheduledStartTime', date ? date.toISOString() : undefined)}
          />
        </div>
      </div>

      <div className="stream-form-actions">
        <Button onClick={onPreview} className="stream-form-submit-button">
          Preview
        </Button>
        <Button variant={ButtonVariant.SECONDARY} onClick={onCancel} className="stream-form-cancel-button">
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function StreamForm() {
  const navigate = useNavigate();
  const params = useParams<{ owner?: string; topic?: string }>();

  const { streamList, refreshStreamList } = useAppContext();
  const { session } = useUserContext();

  const { metadata, updateField, validateForm, initializeFromStream, isInitializing } = useStreamForm();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const isEditMode = !!(params.owner && params.topic);
  const editOwner = params.owner;
  const editTopic = params.topic;

  const streamToEdit = useMemo(() => {
    if (!isEditMode || !editTopic || !editOwner || !streamList) return null;
    return streamList.find((stream) => stream.topic === editTopic && stream.owner === editOwner);
  }, [isEditMode, editTopic, editOwner, streamList]);

  useEffect(() => {
    if (isEditMode && streamToEdit) {
      initializeFromStream(streamToEdit);
    }
  }, [isEditMode, streamToEdit, initializeFromStream]);

  const handleCancel = () => {
    // Check if there's previous history by checking if we can go back
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(ROUTES.STREAM_BROWSER);
    }
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

  const handleSubmitStream = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (!session) {
        setError('User session not found. Please log in again.');
      }

      if (isEditMode && streamToEdit) {
        await updateStream(session!, metadata, streamToEdit.topic, streamToEdit.owner);
        await refreshStreamList();
      } else {
        await createStream(session!, metadata);
        await refreshStreamList();
      }

      navigate(ROUTES.STREAM_MANAGER);
    } catch (err) {
      const errorMessage = isEditMode ? 'Failed to update stream' : 'Failed to create stream';
      setError(err instanceof Error ? err.message : errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="stream-form">
      <div className="stream-form-container">
        {isPreviewMode ? (
          <StreamMetadataPreview
            metadata={metadata}
            error={error}
            isLoading={isLoading}
            isEditMode={isEditMode}
            onBack={handleBackToEdit}
            onConfirm={handleSubmitStream}
          />
        ) : (
          <StreamEditForm
            metadata={metadata}
            error={error}
            onFieldChange={updateField}
            onCancel={handleCancel}
            onPreview={handlePreview}
            onError={setError}
            isInitializing={isInitializing}
          />
        )}
      </div>
    </div>
  );
}
