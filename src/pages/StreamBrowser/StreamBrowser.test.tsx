import { render, screen } from '@testing-library/react';

import { StreamBrowser } from './StreamBrowser';

jest.mock('@/components/StreamList/StreamList', () => ({
  StreamList: () => <div data-testid="stream-list">StreamList</div>,
}));

const setNewStreamList = jest.fn();
const fetchAppState = jest.fn();
jest.mock('@/providers/App', () => ({
  useAppContext: () => ({
    fetchAppState,
    setNewStreamList,
  }),
}));

jest.mock('swr', () => jest.fn());

import useSWR from 'swr';

describe('StreamBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the StreamList component', () => {
    (useSWR as jest.Mock).mockReturnValue({ data: undefined });
    render(<StreamBrowser />);
    expect(screen.getByTestId('stream-list')).toBeInTheDocument();
  });

  it('calls setNewStreamList when data is available', () => {
    (useSWR as jest.Mock).mockReturnValue({ data: { streams: ['a', 'b'] } });
    render(<StreamBrowser />);
    expect(setNewStreamList).toHaveBeenCalledWith({ streams: ['a', 'b'] });
  });
});
