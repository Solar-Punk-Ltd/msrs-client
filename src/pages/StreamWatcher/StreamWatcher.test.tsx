import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => {
  const actual = vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: vi.fn(),
  };
});

import { useParams } from 'react-router-dom';

describe('StreamWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Invalid stream" if params are missing', () => {
    (useParams as any).mockReturnValue({ mediatype: undefined, owner: undefined, topic: undefined });
    render(<StreamWatcher />);
    expect(screen.getByText(/Invalid stream/i)).toBeInTheDocument();
  });

  it('renders SwarmHlsPlayer and Chat with correct props', () => {
    (useParams as any).mockReturnValue({ mediatype: 'video', owner: 'alice', topic: 'testtopic' });
    render(<StreamWatcher />);
    expect(screen.getByTestId('swarm-hls-player')).toHaveTextContent('"owner":"alice"');
    expect(screen.getByTestId('swarm-hls-player')).toHaveTextContent('"topic":"testtopic"');
    expect(screen.getByTestId('swarm-hls-player')).toHaveTextContent('"mediatype":"video"');
    expect(screen.getByTestId('chat')).toHaveTextContent('"topic":"testtopic"');
  });

  it('navigates back when Back button is clicked', () => {
    (useParams as any).mockReturnValue({ mediatype: 'video', owner: 'alice', topic: 'testtopic' });
    render(<StreamWatcher />);
    fireEvent.click(screen.getByText('← Back'));
    expect(mockNavigate).toHaveBeenCalledWith('/streams');
  });
});
