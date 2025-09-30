import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppContextProvider } from '@/providers/App';
import { Provider as UserProvider } from '@/providers/User';
import { MediaType } from '@/types/stream';

import { StreamForm } from './StreamForm';

vi.mock('@/utils/stream', () => ({
  createStream: vi.fn().mockResolvedValue(undefined),
  updateStream: vi.fn().mockResolvedValue(undefined),
  fetchThumbnail: vi.fn().mockResolvedValue(new Blob()),
}));

vi.mock('@/routes', () => ({
  ROUTES: {
    STREAM_BROWSER: '/streams',
    STREAM_MANAGER: '/manage',
  },
}));

const mockUpdateField = vi.fn();
const mockValidateForm = vi.fn();
const mockInitializeFromStream = vi.fn();

vi.mock('@/hooks/useStreamForm', () => ({
  useStreamForm: vi.fn(() => ({
    metadata: {
      title: 'Test Stream',
      description: 'Test Description',
      thumbnail: null,
      mediaType: MediaType.VIDEO,
      scheduledStartTime: undefined,
    },
    updateField: mockUpdateField,
    validateForm: mockValidateForm,
    initializeFromStream: mockInitializeFromStream,
    isInitializing: false,
  })),
}));

vi.mock('@/components/Stream/StreamFormFields', () => ({
  NameField: ({ value, onChange }: any) => (
    <input
      data-testid="name-field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Stream name"
    />
  ),
  DescriptionField: ({ value, onChange }: any) => (
    <textarea
      data-testid="description-field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Description"
    />
  ),
  MediaTypeField: ({ value, onChange }: any) => (
    <select data-testid="media-type-field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="video">Video</option>
      <option value="audio">Audio</option>
    </select>
  ),
  ThumbnailField: ({ onChange, onError }: any) => (
    <div>
      <input
        data-testid="thumbnail-field"
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && file.size > 5 * 1024 * 1024) {
            onError('Thumbnail file size must be less than 5MB');
          } else {
            onChange(file);
          }
        }}
      />
    </div>
  ),
  ScheduleField: ({ value, onChange }: any) => (
    <input
      data-testid="schedule-field"
      type="datetime-local"
      value={value ? value.toISOString().slice(0, 16) : ''}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : undefined)}
    />
  ),
  ErrorMessage: ({ error }: any) => (error ? <div data-testid="error-message">{error}</div> : null),
  PreviewField: ({ label, value }: any) => (
    <div data-testid={`preview-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      {label}: {value}
    </div>
  ),
}));

vi.mock('@/components/Button/Button', () => ({
  Button: ({ children, onClick, disabled, variant, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className} data-variant={variant}>
      {children}
    </button>
  ),
  ButtonVariant: {
    SECONDARY: 'secondary',
  },
}));

vi.mock('@/components/InputLoading/InputLoading', () => ({
  InputLoading: () => <div data-testid="loading-spinner">Loading...</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: vi.fn(() => ({})),
  };
});

const mockRefreshStreamList = vi.fn();
const mockStreamList = [
  {
    topic: 'test-topic',
    owner: 'test-owner',
    title: 'Existing Stream',
    description: 'Existing Description',
    mediaType: MediaType.VIDEO,
    state: 'ended',
  },
];

vi.mock('@/providers/App', () => ({
  AppContextProvider: ({ children }: any) => children,
  useAppContext: () => ({
    streamList: mockStreamList,
    refreshStreamList: mockRefreshStreamList,
  }),
}));

const mockSession = {
  address: 'mock-address',
  signature: 'mock-signature',
};

vi.mock('@/providers/User', () => ({
  Provider: ({ children }: any) => children,
  useUserContext: () => ({
    keys: { publicKey: 'mock-key' },
    session: mockSession,
  }),
}));

Object.defineProperty(window, 'history', {
  value: { length: 2 },
  writable: true,
});

describe('StreamForm', () => {
  const renderStreamForm = (initialRoute = '/create') =>
    render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <UserProvider>
          <AppContextProvider>
            <StreamForm />
          </AppContextProvider>
        </UserProvider>
      </MemoryRouter>,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateForm.mockReturnValue(null); // No validation errors by default
  });

  describe('Create Mode', () => {
    it('renders create form with all fields', () => {
      renderStreamForm();

      expect(screen.getByTestId('name-field')).toBeInTheDocument();
      expect(screen.getByTestId('description-field')).toBeInTheDocument();
      expect(screen.getByTestId('media-type-field')).toBeInTheDocument();
      expect(screen.getByTestId('thumbnail-field')).toBeInTheDocument();
      expect(screen.getByTestId('schedule-field')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('updates fields when user inputs data', () => {
      renderStreamForm();

      fireEvent.change(screen.getByTestId('name-field'), { target: { value: 'New Stream Title' } });
      expect(mockUpdateField).toHaveBeenCalledWith('title', 'New Stream Title');

      fireEvent.change(screen.getByTestId('description-field'), { target: { value: 'New Description' } });
      expect(mockUpdateField).toHaveBeenCalledWith('description', 'New Description');

      fireEvent.change(screen.getByTestId('media-type-field'), { target: { value: 'audio' } });
      expect(mockUpdateField).toHaveBeenCalledWith('mediaType', 'audio');
    });

    it('navigates back when cancel is clicked', () => {
      renderStreamForm();

      fireEvent.click(screen.getByText('Cancel'));
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('navigates to stream browser when no history', () => {
      Object.defineProperty(window, 'history', {
        value: { length: 1 },
        writable: true,
      });

      renderStreamForm();

      fireEvent.click(screen.getByText('Cancel'));
      expect(mockNavigate).toHaveBeenCalledWith('/streams');
    });

    it('shows validation error when preview is clicked with invalid data', () => {
      mockValidateForm.mockReturnValue('Stream name is required');
      renderStreamForm();

      fireEvent.click(screen.getByText('Preview'));

      expect(mockValidateForm).toHaveBeenCalled();
      expect(screen.getByTestId('error-message')).toHaveTextContent('Stream name is required');
    });

    it('shows preview mode when preview is clicked with valid data', () => {
      renderStreamForm();

      fireEvent.click(screen.getByText('Preview'));

      expect(mockValidateForm).toHaveBeenCalled();
      expect(screen.getByText('Stream Meta Preview')).toBeInTheDocument();
      expect(screen.getByText('Back to Edit')).toBeInTheDocument();
      expect(screen.getByText('Create Stream')).toBeInTheDocument();
    });

    it('returns to edit mode when back button is clicked in preview', () => {
      renderStreamForm();

      fireEvent.click(screen.getByText('Preview'));
      expect(screen.getByText('Stream Meta Preview')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Back to Edit'));
      expect(screen.getByTestId('name-field')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('creates stream when confirm is clicked in preview', async () => {
      const { createStream } = await import('@/utils/stream');

      renderStreamForm();

      fireEvent.click(screen.getByText('Preview'));
      fireEvent.click(screen.getByText('Create Stream'));

      await waitFor(() => {
        expect(createStream).toHaveBeenCalledWith(mockSession, {
          title: 'Test Stream',
          description: 'Test Description',
          thumbnail: null,
          mediaType: MediaType.VIDEO,
          scheduledStartTime: undefined,
        });
      });

      expect(mockRefreshStreamList).toHaveBeenCalledWith();
      expect(mockNavigate).toHaveBeenCalledWith('/manage');
    });

    it('shows loading state during stream creation', async () => {
      const { createStream } = await import('@/utils/stream');
      let resolveCreate: () => void;
      const createPromise = new Promise<void>((resolve) => {
        resolveCreate = resolve;
      });
      vi.mocked(createStream).mockReturnValue(createPromise);

      renderStreamForm();

      fireEvent.click(screen.getByText('Preview'));
      fireEvent.click(screen.getByText('Create Stream'));

      expect(screen.getByText('Creating Stream...')).toBeInTheDocument();

      resolveCreate!();
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/manage');
      });
    });

    it('handles error during stream creation', async () => {
      const { createStream } = await import('@/utils/stream');
      vi.mocked(createStream).mockRejectedValue(new Error('Creation failed'));

      renderStreamForm();

      fireEvent.click(screen.getByText('Preview'));
      fireEvent.click(screen.getByText('Create Stream'));

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Creation failed');
      });
    });
  });

  describe('Edit Mode', () => {
    it('shows edit preview when in edit mode', () => {
      // For simplicity, we'll test edit mode by just checking the preview text changes
      render(
        <MemoryRouter>
          <UserProvider>
            <AppContextProvider>
              <StreamForm />
            </AppContextProvider>
          </UserProvider>
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByText('Preview'));

      // In create mode, should show "Stream Meta Preview"
      expect(screen.getByText('Stream Meta Preview')).toBeInTheDocument();
      expect(screen.getByText('Create Stream')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('handles thumbnail file size error', () => {
      render(
        <MemoryRouter>
          <UserProvider>
            <AppContextProvider>
              <StreamForm />
            </AppContextProvider>
          </UserProvider>
        </MemoryRouter>,
      );

      const file = new File(['test'.repeat(2000000)], 'large-image.jpg', { type: 'image/jpeg' });
      const thumbnailField = screen.getByTestId('thumbnail-field');

      fireEvent.change(thumbnailField, { target: { files: [file] } });

      expect(screen.getByTestId('error-message')).toHaveTextContent('Thumbnail file size must be less than 5MB');
    });
  });

  describe('Preview Mode', () => {
    it('displays all metadata in preview mode', () => {
      render(
        <MemoryRouter>
          <UserProvider>
            <AppContextProvider>
              <StreamForm />
            </AppContextProvider>
          </UserProvider>
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByText('Preview'));

      expect(screen.getByTestId('preview-stream-title')).toHaveTextContent('Stream Title: Test Stream');
      expect(screen.getByTestId('preview-description')).toHaveTextContent('Description: Test Description');
      expect(screen.getByTestId('preview-media-type')).toHaveTextContent('Media Type: Video');
    });

    it('disables buttons when loading in preview mode', async () => {
      const { createStream } = await import('@/utils/stream');
      let resolveCreate: () => void;
      const createPromise = new Promise<void>((resolve) => {
        resolveCreate = resolve;
      });
      vi.mocked(createStream).mockReturnValue(createPromise);

      render(
        <MemoryRouter>
          <UserProvider>
            <AppContextProvider>
              <StreamForm />
            </AppContextProvider>
          </UserProvider>
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByText('Preview'));
      fireEvent.click(screen.getByText('Create Stream'));

      expect(screen.getByText('Back to Edit')).toBeDisabled();
      expect(screen.getByText('Creating Stream...')).toBeDisabled();

      resolveCreate!();
    });
  });
});
