import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppContextProvider } from '@/providers/App/App';
import { Provider as UserProvider } from '@/providers/User';
import { MessageReceiveMode } from '@/types/messaging';
import { createMsrsIngestionToken } from '@/utils/auth/login';
import { deleteStream } from '@/utils/stream/stream';

import { StreamManager } from './StreamManager';

vi.mock('@/utils/stream/stream', () => ({
  deleteStream: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/auth/login', () => ({
  createMsrsIngestionToken: vi.fn().mockResolvedValue('mock-token-12345'),
}));

vi.mock('@/utils/shared/config', () => ({
  config: {
    streamStateTopic: 'mock-topic',
    streamStateOwner: 'mock-owner',
    readerBeeUrl: 'http://mock-bee.com',
    messageReceiveMode: MessageReceiveMode.SWARM,
  },
}));

vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: [
      {
        topic: 'topic1',
        owner: 'owner1',
        state: 'live',
        duration: 100,
        mediaType: 'video',
        title: 'Live Stream',
        timestamp: 1000,
        index: 1,
      },
      {
        topic: 'topic2',
        owner: 'owner2',
        state: 'ended',
        duration: 200,
        mediaType: 'audio',
        title: 'Ended Stream',
        timestamp: 900,
        index: 2,
      },
    ],
  })),
}));

vi.mock('@/components/Stream', () => ({
  StreamManagerList: ({ onEdit, onDelete, onShowToken }: any) => (
    <div data-testid="stream-manager-list">
      <button onClick={() => onEdit({ owner: 'owner1', topic: 'topic1' })}>Edit Stream 1</button>
      <button onClick={() => onDelete({ owner: 'owner1', topic: 'topic1', title: 'Live Stream' })}>
        Delete Stream 1
      </button>
      <button onClick={() => onShowToken({ owner: 'owner1', topic: 'topic1', mediaType: 'video' })}>
        Show Token Stream 1
      </button>
    </div>
  ),
}));

vi.mock('@/components/ConfirmationModal/ConfirmationModal', () => ({
  ConfirmationModal: ({ isOpen, title, message, onConfirm, onCancel, isLoading }: any) =>
    isOpen ? (
      <div data-testid="confirmation-modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <button onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Deleting...' : 'Confirm'}
        </button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockFetchAppState = vi.fn();
const mockSetNewStreamList = vi.fn();
const mockRefreshStreamList = vi.fn();
const mockIsLoading = false;

vi.mock('@/providers/App/App', () => ({
  AppContextProvider: ({ children }: any) => children,
  useAppContext: vi.fn(() => ({
    fetchAppState: mockFetchAppState,
    setNewStreamList: mockSetNewStreamList,
    refreshStreamList: mockRefreshStreamList,
    isLoading: mockIsLoading,
    streamList: [],
    error: null,
    messageReceiveMode: MessageReceiveMode.SWARM,
  })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useQueryClient: vi.fn(),
}));

import { useQuery } from '@tanstack/react-query';

const mockSession = {
  address: 'mock-address',
  signature: 'mock-signature',
};

vi.mock('@/providers/User', () => ({
  Provider: ({ children }: any) => children,
  useUserContext: () => ({
    session: mockSession,
  }),
}));

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

global.alert = vi.fn();

global.console.error = vi.fn();

describe('StreamManager', () => {
  const renderStreamManager = () =>
    render(
      <MemoryRouter>
        <UserProvider>
          <AppContextProvider>
            <StreamManager />
          </AppContextProvider>
        </UserProvider>
      </MemoryRouter>,
    );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deleteStream).mockResolvedValue(undefined);
    vi.mocked(createMsrsIngestionToken).mockResolvedValue('mock-token-12345');
    (useQuery as any).mockReturnValue({
      data: [
        {
          owner: 'owner1',
          topic: 'topic1',
          title: 'Stream 1',
          mediaType: 'video',
        },
      ],
    });
  });

  it('renders the stream manager with list', () => {
    renderStreamManager();

    expect(screen.getByTestId('stream-manager-list')).toBeInTheDocument();
    expect(screen.getByText('Edit Stream 1')).toBeInTheDocument();
    expect(screen.getByText('Delete Stream 1')).toBeInTheDocument();
    expect(screen.getByText('Show Token Stream 1')).toBeInTheDocument();
  });

  it('navigates to edit page when edit is clicked', () => {
    renderStreamManager();

    fireEvent.click(screen.getByText('Edit Stream 1'));

    expect(mockNavigate).toHaveBeenCalledWith('/edit/owner1/topic1');
  });

  it('opens delete modal when delete is clicked', () => {
    renderStreamManager();

    fireEvent.click(screen.getByText('Delete Stream 1'));

    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();
    expect(screen.getByText('Delete Stream')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete "Live Stream"?')).toBeInTheDocument();
  });

  it('closes delete modal when cancel is clicked', () => {
    renderStreamManager();

    fireEvent.click(screen.getByText('Delete Stream 1'));
    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
  });

  it('deletes stream when confirmed', async () => {
    renderStreamManager();

    fireEvent.click(screen.getByText('Delete Stream 1'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(deleteStream).toHaveBeenCalledWith(mockSession, 'topic1', 'owner1');
    });

    expect(mockRefreshStreamList).toHaveBeenCalledWith();
  });

  it('shows modal with clipboard success message when clipboard works', async () => {
    renderStreamManager();

    fireEvent.click(screen.getByText('Show Token Stream 1'));

    await waitFor(() => {
      expect(createMsrsIngestionToken).toHaveBeenCalledWith(mockSession, {
        t: 'mock-topic',
        o: 'mock-owner',
        si: 'owner1/topic1',
        m: 'video',
      });
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('mock-token-12345');

    await waitFor(() => {
      expect(screen.getByText('MSRS Ingestion Token')).toBeInTheDocument();
      expect(
        screen.getByText('Token has been copied to your clipboard. Use this token for stream ingestion:'),
      ).toBeInTheDocument();
      expect(screen.getByText('mock-token-12345')).toBeInTheDocument();
    });
  });

  it('shows modal with manual copy message when clipboard fails', async () => {
    navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error('Clipboard failed'));

    renderStreamManager();

    fireEvent.click(screen.getByText('Show Token Stream 1'));

    await waitFor(() => {
      expect(screen.getByText('MSRS Ingestion Token')).toBeInTheDocument();
      expect(screen.getByText('Please manually copy this token for stream ingestion:')).toBeInTheDocument();
      expect(screen.getByText('mock-token-12345')).toBeInTheDocument();
    });
  });

  it('shows modal with manual copy message when clipboard is not available', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
    });

    renderStreamManager();

    fireEvent.click(screen.getByText('Show Token Stream 1'));

    await waitFor(() => {
      expect(screen.getByText('MSRS Ingestion Token')).toBeInTheDocument();
      expect(screen.getByText('Please manually copy this token for stream ingestion:')).toBeInTheDocument();
      expect(screen.getByText('mock-token-12345')).toBeInTheDocument();
    });
  });

  it('handles error during stream deletion', async () => {
    vi.mocked(deleteStream).mockRejectedValueOnce(new Error('Delete failed'));

    renderStreamManager();

    fireEvent.click(screen.getByText('Delete Stream 1'));
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(global.console.error).toHaveBeenCalledWith('Failed to delete stream:', expect.any(Error));
    });
  });

  it('shows loading state during deletion', async () => {
    let resolveDelete: () => void;
    const deletePromise = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    vi.mocked(deleteStream).mockReturnValueOnce(deletePromise);

    renderStreamManager();

    fireEvent.click(screen.getByText('Delete Stream 1'));
    fireEvent.click(screen.getByText('Confirm'));

    expect(screen.getByText('Deleting...')).toBeInTheDocument();

    resolveDelete!();
    await waitFor(() => {
      expect(screen.queryByTestId('confirmation-modal')).not.toBeInTheDocument();
    });
  });
});
