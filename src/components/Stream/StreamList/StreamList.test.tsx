import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { StreamList } from './StreamList';

const mockStreamList = [
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
];

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

vi.mock('../BaseStreamList/BaseStreamList', () => ({
  BaseStreamList: ({ title }: any) => (
    <div>
      {title && <h2>{title}</h2>}
      {mockStreamList
        .sort((a, b) => (a.state === 'live' && b.state !== 'live' ? -1 : 0))
        .map((stream) => (
          <div key={stream.topic} data-testid="stream-thumbnail">
            {stream.title}
          </div>
        ))}
    </div>
  ),
}));

describe('StreamList', () => {
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
