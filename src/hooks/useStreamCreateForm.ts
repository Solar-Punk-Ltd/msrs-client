import { useState } from 'react';

import { ERROR_MESSAGES, LIMITS, StreamMetadata } from '@/pages/StreamCreate/StreamCreate';

export function useStreamForm() {
  const [metadata, setMetadata] = useState<StreamMetadata>({
    name: '',
    description: '',
    thumbnail: null,
    mediaType: 'video',
    scheduledStartTime: undefined,
  });

  const updateField = (field: keyof StreamMetadata, value: any) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    if (!metadata.name.trim()) {
      return ERROR_MESSAGES.NAME_REQUIRED;
    }
    if (metadata.name.length > LIMITS.NAME_MAX_LENGTH) {
      return ERROR_MESSAGES.NAME_TOO_LONG;
    }
    if (!metadata.description.trim()) {
      return ERROR_MESSAGES.DESCRIPTION_REQUIRED;
    }
    if (metadata.description.length > LIMITS.DESCRIPTION_MAX_LENGTH) {
      return ERROR_MESSAGES.DESCRIPTION_TOO_LONG;
    }
    if (!metadata.thumbnail) {
      return ERROR_MESSAGES.THUMBNAIL_REQUIRED;
    }
    if (!metadata.scheduledStartTime) {
      return ERROR_MESSAGES.SCHEDULED_TIME_REQUIRED;
    }
    return null;
  };

  return {
    metadata,
    updateField,
    validateForm,
  };
}
