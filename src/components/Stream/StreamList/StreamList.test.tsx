import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StreamList } from './StreamList';

vi.mock('@/utils/stream', () => ({
  fetchStreams: vi.fn().mockResolvedValue([]),
  fetchThumbnail: vi.fn().mockResolvedValue(null),
  uploadThumbnail: vi.fn().mockResolvedValue('mock-ref'),
  createStream: vi.fn().mockResolvedValue(undefined),
  updateStream: vi.fn().mockResolvedValue(undefined),
  deleteStream: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../StreamThumbnail/StreamThumbnail', () => ({
  StreamThumbnail: (props: any) => <div data-testid="stream-thumbnail">{props.title || props.topic}</div>,
}));
vi.mock('@/providers/App', () => ({
  useAppContext: () => ({
    streamList: [
      {
        topic: 'topic1',
        owner: 'owner1',
        state: 'live',
        duration: 100,
        mediatype: 'video',
        title: 'Live Stream',
        timestamp: 1000,
        index: 1,
      },
      {
        topic: 'topic2',
        owner: 'owner2',
        state: 'ended',
        duration: 200,
        mediatype: 'audio',
        title: 'Ended Stream',
        timestamp: 900,
        index: 2,
      },
    ],
  }),
}));
vi.mock('@/utils/bee', () => ({
  makeFeedIdentifier: () => ({
    toHex: () => 'feedhex',
  }),
}));
vi.mock('@/utils/config', () => ({
  config: {
    readerBeeUrl: 'http://mockbee',
  },
}));
vi.mock('@ethersphere/bee-js', () => ({
  Bee: vi.fn().mockImplementation(() => ({})),
  Topic: { fromString: (s: string) => s },
  FeedIndex: { fromBigInt: () => ({}) },
  Bytes: { fromUtf8: vi.fn() },
  PrivateKey: vi.fn(),
  Identifier: { fromString: vi.fn() },
}));

describe('StreamList', () => {
  it('renders the stream list title', () => {
    render(<StreamList />);
    expect(screen.getByText(/Watch streams on Swarm!/i)).toBeInTheDocument();
  });

  it('renders all StreamThumbnail components for streams', () => {
    render(<StreamList />);
    const thumbnails = screen.getAllByTestId('stream-thumbnail');
    expect(thumbnails.length).toBe(2);
    expect(screen.getByText('Live Stream')).toBeInTheDocument();
    expect(screen.getByText('Ended Stream')).toBeInTheDocument();
  });

  it('renders live streams first', () => {
    render(<StreamList />);
    const thumbnails = screen.getAllByTestId('stream-thumbnail');
    expect(thumbnails[0]).toHaveTextContent('Live Stream');
    expect(thumbnails[1]).toHaveTextContent('Ended Stream');
  });
});
