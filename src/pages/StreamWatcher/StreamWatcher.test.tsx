import { MemoryRouter, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Provider as UserProvider } from '@/providers/User';

import { StreamWatcher } from './StreamWatcher';

vi.mock('@/components/Stream/SwarmHlsPlayer/SwarmHlsPlayer', () => ({
  SwarmHlsPlayer: (props: any) => <div data-testid="swarm-hls-player">{JSON.stringify(props)}</div>,
}));
vi.mock('@/components/Chat/Chat', () => ({
  Chat: (props: any) => <div data-testid="chat">{JSON.stringify(props)}</div>,
}));
vi.mock('@/components/Stream/StreamInfo/StreamInfo', () => ({
  StreamInfo: (props: any) => <div data-testid="stream-info">{JSON.stringify(props)}</div>,
}));
vi.mock('@/components/Button/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  ButtonVariant: { SECONDARY: 'secondary' },
}));
vi.mock('@/routes', () => ({
  ROUTES: { STREAM_BROWSER: '/streams' },
}));

vi.mock('@/utils/login', () => ({
  autoLogin: vi.fn(),
}));

vi.mock('@/providers/App', () => ({
  useAppContext: () => ({
    streamList: [
      {
        topic: 'testtopic',
        owner: 'alice',
        title: 'Test Stream',
        description: 'Test Description',
        state: 'live',
        mediaType: 'video',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    isLoading: false,
    error: null,
    setNewStreamList: vi.fn(),
    fetchAppState: vi.fn(),
    refreshStreamList: vi.fn(),
  }),
  AppContextProvider: ({ children }: any) => children,
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    }),
  };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: vi.fn(),
  };
});

describe('StreamWatcher', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderStreamWatcher = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <UserProvider>
            <StreamWatcher />
          </UserProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Invalid stream" if params are missing', () => {
    (useParams as any).mockReturnValue({ mediatype: undefined, owner: undefined, topic: undefined });
    renderStreamWatcher();
    expect(screen.getByText(/Invalid stream/i)).toBeInTheDocument();
  });

  it('renders SwarmHlsPlayer and Chat with correct props', () => {
    (useParams as any).mockReturnValue({ mediatype: 'video', owner: 'alice', topic: 'testtopic' });
    renderStreamWatcher();
    expect(screen.getByTestId('swarm-hls-player')).toHaveTextContent('"owner":"alice"');
    expect(screen.getByTestId('swarm-hls-player')).toHaveTextContent('"topic":"testtopic"');
    expect(screen.getByTestId('swarm-hls-player')).toHaveTextContent('"mediaType":"video"');
    expect(screen.getByTestId('chat')).toHaveTextContent('"topic":"testtopic"');
  });

  it('navigates back when Back button is clicked', () => {
    (useParams as any).mockReturnValue({ mediatype: 'video', owner: 'alice', topic: 'testtopic' });
    renderStreamWatcher();
    fireEvent.click(screen.getByText(/back/i));
    expect(mockNavigate).toHaveBeenCalledWith('/streams');
  });
});
