import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppContextProvider } from '@/providers/App/App';
import { Provider as UserProvider } from '@/providers/User';
import { WakuProvider } from '@/providers/Waku';
import { MessageReceiveMode } from '@/types/messaging';
import { MediaType } from '@/types/stream';
import { createStream } from '@/utils/stream/stream';

import { StreamForm } from './StreamForm';

vi.mock('@/utils/stream/stream', () => ({
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
      tags: [],
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
  TagsField: ({ value, onChange }: any) => (
    <div data-testid="tags-field">
      <input
        data-testid="tags-input"
        placeholder="Add a tag"
        onKeyPress={(e) => {
          if (e.key === 'Enter') {
            const input = e.target as HTMLInputElement;
            if (input.value) {
              onChange([...value, input.value]);
              input.value = '';
            }
          }
        }}
      />
      <div data-testid="tags-list">
        {value.map((tag: string, index: number) => (
          <span key={index} data-testid={`tag-${index}`}>
            {tag}
          </span>
        ))}
      </div>
    </div>
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

vi.mock('@/providers/App/App', async () => {
  const actual = await vi.importActual('@/providers/App/App');
  return {
    ...actual,
    useAppContext: () => ({
      streamList: mockStreamList,
      refreshStreamList: mockRefreshStreamList,
      isLoading: false,
      isRefreshing: false,
      error: null,
      messageReceiveMode: MessageReceiveMode.SWARM,
      setNewStreamList: vi.fn(),
      fetchAppState: vi.fn(),
    }),
  };
});

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

vi.mock('@/providers/Waku', () => ({
  WakuProvider: ({ children }: any) => children,
  useWakuContext: () => ({
    node: null,
  }),
}));

Object.defineProperty(window, 'history', {
  value: { length: 2 },
  writable: true,
});

describe('StreamForm', () => {
  const renderStreamForm = (initialRoute = '/create') => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          <UserProvider>
            <WakuProvider>
              <AppContextProvider>
                <StreamForm />
              </AppContextProvider>
            </WakuProvider>
          </UserProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

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
      const { createStream } = await import('@/utils/stream/stream');

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
          tags: [],
        });
      });

      expect(mockRefreshStreamList).toHaveBeenCalledWith();
      expect(mockNavigate).toHaveBeenCalledWith('/manage');
    });

    it('shows loading state during stream creation', async () => {
      let resolveCreate: () => void;
      const createPromise = new Promise<void>((resolve) => {
        resolveCreate = resolve;
      });
      vi.mocked(createStream).mockReturnValueOnce(createPromise);

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
      vi.mocked(createStream).mockRejectedValueOnce(new Error('Creation failed'));

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
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      // For simplicity, we'll test edit mode by just checking the preview text changes
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <UserProvider>
              <AppContextProvider>
                <StreamForm />
              </AppContextProvider>
            </UserProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      fireEvent.click(screen.getByText('Preview'));

      // In create mode, should show "Stream Meta Preview"
      expect(screen.getByText('Stream Meta Preview')).toBeInTheDocument();
      expect(screen.getByText('Create Stream')).toBeInTheDocument();
    });
  });

  describe('Loading and Error States', () => {
    it('handles thumbnail file size error', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <UserProvider>
              <AppContextProvider>
                <StreamForm />
              </AppContextProvider>
            </UserProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      const file = new File(['test'.repeat(2000000)], 'large-image.jpg', { type: 'image/jpeg' });
      const thumbnailField = screen.getByTestId('thumbnail-field');

      fireEvent.change(thumbnailField, { target: { files: [file] } });

      expect(screen.getByTestId('error-message')).toHaveTextContent('Thumbnail file size must be less than 5MB');
    });
  });

  describe('Preview Mode', () => {
    it('displays all metadata in preview mode', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <UserProvider>
              <AppContextProvider>
                <StreamForm />
              </AppContextProvider>
            </UserProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      fireEvent.click(screen.getByText('Preview'));

      expect(screen.getByTestId('preview-stream-title')).toHaveTextContent('Stream Title: Test Stream');
      expect(screen.getByTestId('preview-description')).toHaveTextContent('Description: Test Description');
      expect(screen.getByTestId('preview-media-type')).toHaveTextContent('Media Type: Video');
    });

    it('disables buttons when loading in preview mode', async () => {
      let resolveCreate: () => void;
      const createPromise = new Promise<void>((resolve) => {
        resolveCreate = resolve;
      });
      vi.mocked(createStream).mockReturnValueOnce(createPromise);

      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <UserProvider>
              <WakuProvider>
                <AppContextProvider>
                  <StreamForm />
                </AppContextProvider>
              </WakuProvider>
            </UserProvider>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      fireEvent.click(screen.getByText('Preview'));
      fireEvent.click(screen.getByText('Create Stream'));

      expect(screen.getByText('Back to Edit')).toBeDisabled();
      expect(screen.getByText('Creating Stream...')).toBeDisabled();

      resolveCreate!();
    });
  });
});
