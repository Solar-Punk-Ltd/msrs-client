import { fireEvent, render, screen } from '@testing-library/react';

import { StreamWatcher } from './StreamWatcher';

jest.mock('@/components/SwarmHlsPlayer/SwarmHlsPlayer', () => ({
  SwarmHlsPlayer: (props: any) => <div data-testid="swarm-hls-player">{JSON.stringify(props)}</div>,
}));
jest.mock('@/components/Chat/Chat', () => ({
  Chat: (props: any) => <div data-testid="chat">{JSON.stringify(props)}</div>,
}));
jest.mock('@/components/Button/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  ButtonVariant: { SECONDARY: 'secondary' },
}));
jest.mock('@/routes', () => ({
  ROUTES: { STREAM_BROWSER: '/streams' },
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: jest.fn(),
  };
});

import { useParams } from 'react-router-dom';

describe('StreamWatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders "Invalid stream" if params are missing', () => {
    (useParams as jest.Mock).mockReturnValue({ mediatype: undefined, owner: undefined, topic: undefined });
    render(<StreamWatcher />);
    expect(screen.getByText(/Invalid stream/i)).toBeInTheDocument();
  });

  it('renders SwarmHlsPlayer and Chat with correct props', () => {
    (useParams as jest.Mock).mockReturnValue({ mediatype: 'video', owner: 'alice', topic: 'testtopic' });
    render(<StreamWatcher />);
    expect(screen.getByTestId('swarm-hls-player')).toHaveTextContent('"owner":"alice"');
    expect(screen.getByTestId('swarm-hls-player')).toHaveTextContent('"topic":"testtopic"');
    expect(screen.getByTestId('swarm-hls-player')).toHaveTextContent('"mediatype":"video"');
    expect(screen.getByTestId('chat')).toHaveTextContent('"topic":"testtopic"');
  });

  it('navigates back when Back button is clicked', () => {
    (useParams as jest.Mock).mockReturnValue({ mediatype: 'video', owner: 'alice', topic: 'testtopic' });
    render(<StreamWatcher />);
    fireEvent.click(screen.getByText('← Back'));
    expect(mockNavigate).toHaveBeenCalledWith('/streams');
  });
});
