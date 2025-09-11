import { MemoryRouter, useParams } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppContextProvider } from '@/providers/App';
import { Provider as UserProvider } from '@/providers/User';

import { StreamWatcher } from './StreamWatcher';

vi.mock('@/components/SwarmHlsPlayer/SwarmHlsPlayer', () => ({
  SwarmHlsPlayer: (props: any) => <div data-testid="swarm-hls-player">{JSON.stringify(props)}</div>,
}));
vi.mock('@/components/Chat/Chat', () => ({
  Chat: (props: any) => <div data-testid="chat">{JSON.stringify(props)}</div>,
}));
vi.mock('@/components/Button/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  ButtonVariant: { SECONDARY: 'secondary' },
}));
vi.mock('@/routes', () => ({
  ROUTES: { STREAM_BROWSER: '/streams' },
}));

// Mock the login utility
vi.mock('@/utils/login', () => ({
  autoLogin: vi.fn(),
}));

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
  const renderStreamWatcher = () =>
    render(
      <MemoryRouter>
        <AppContextProvider>
          <UserProvider>
            <StreamWatcher />
          </UserProvider>
        </AppContextProvider>
      </MemoryRouter>,
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
