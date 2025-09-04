import { useCallback, useState } from 'react';

import { ERROR_MESSAGES, LIMITS, StreamMetadata } from '@/pages/StreamForm/StreamForm';
import { MediaType, type Stream } from '@/types/stream';
import { fetchThumbnail } from '@/utils/stream';

export function useStreamForm() {
  const [metadata, setMetadata] = useState<StreamMetadata>({
    title: '',
    description: '',
    thumbnail: null,
    mediaType: MediaType.VIDEO,
    scheduledStartTime: undefined,
  });

  const [isInitializing, setIsInitializing] = useState(false);

  const updateField = (field: keyof StreamMetadata, value: any) => {
    setMetadata((prev) => ({ ...prev, [field]: value }));
  };

  const getThumbnail = async (thumbnail?: File | string): Promise<File | null> => {
    if (!thumbnail) {
      return null;
    }

    if (typeof thumbnail === 'string') {
      try {
        const res = await fetchThumbnail(thumbnail, { url: false });
        if (res instanceof Blob) {
          return new File([res], thumbnail, { type: res.type });
        }
        return null;
      } catch (error) {
        console.error('Error fetching thumbnail:', error);
        return null;
      }
    }

    if (thumbnail instanceof File) {
      return thumbnail;
    }

    return null;
  };

  const initializeFromStream = useCallback(async (stream: Stream) => {
    setIsInitializing(true);
    const thumbnail = await getThumbnail(stream.thumbnail);

    setMetadata({
      thumbnail,
      title: stream.title,
      description: stream.description || '',
      mediaType: stream.mediaType,
      scheduledStartTime: stream.scheduledStartTime,
    });
    setIsInitializing(false);
  }, []);

  const validateForm = (): string | null => {
    if (!metadata.title.trim()) {
      return ERROR_MESSAGES.NAME_REQUIRED;
    }
    if (metadata.title.length > LIMITS.NAME_MAX_LENGTH) {
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
    initializeFromStream,
    isInitializing,
  };
}
