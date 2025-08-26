import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StreamBrowser } from './StreamBrowser';

vi.mock('@/components/StreamList/StreamList', () => ({
  StreamList: () => <div data-testid="stream-list">StreamList</div>,
}));

const setNewStreamList = vi.fn();
const fetchAppState = vi.fn();
vi.mock('@/providers/App', () => ({
  useAppContext: () => ({
    fetchAppState,
    setNewStreamList,
  }),
}));

vi.mock('swr', () => ({ default: vi.fn() }));

import useSWR from 'swr';

describe('StreamBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the StreamList component', () => {
    (useSWR as any).mockReturnValue({ data: undefined });
    render(<StreamBrowser />);
    expect(screen.getByTestId('stream-list')).toBeInTheDocument();
  });

  it('calls setNewStreamList when data is available', () => {
    (useSWR as any).mockReturnValue({ data: { streams: ['a', 'b'] } });
    render(<StreamBrowser />);
    expect(setNewStreamList).toHaveBeenCalledWith({ streams: ['a', 'b'] });
  });
});
