import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MessageReceiveMode } from '@/types/messaging';

import { StreamBrowser } from './StreamBrowser';

vi.mock('@/components/Stream', () => ({
  StreamList: () => <div data-testid="stream-list">StreamList</div>,
}));

const setNewStreamList = vi.fn();
const fetchAppState = vi.fn();
const isLoading = false;
vi.mock('@/providers/App/App', () => ({
  useAppContext: () => ({
    fetchAppState,
    setNewStreamList,
    isLoading,
    isRefreshing: false,
    streamList: [],
    error: null,
    messageReceiveMode: MessageReceiveMode.SWARM,
    refreshStreamList: vi.fn(),
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

import { useQuery } from '@tanstack/react-query';

describe('StreamBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the StreamList component', () => {
    (useQuery as any).mockReturnValue({ data: undefined });
    render(<StreamBrowser />);
    expect(screen.getByTestId('stream-list')).toBeInTheDocument();
  });

  it('calls setNewStreamList when data is available', () => {
    (useQuery as any).mockReturnValue({ data: [{ streams: ['a', 'b'] }] });
    render(<StreamBrowser />);
    expect(setNewStreamList).toHaveBeenCalledWith([{ streams: ['a', 'b'] }]);
  });
});
