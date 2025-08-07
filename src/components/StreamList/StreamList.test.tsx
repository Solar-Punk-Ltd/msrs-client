import { render, screen } from '@testing-library/react';

import { StreamList } from './StreamList';

jest.mock('@/components/StreamPreview/StreamPreview', () => ({
  StreamPreview: (props: any) => <div data-testid="stream-preview">{props.title || props.topic}</div>,
}));
jest.mock('@/providers/App', () => ({
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
jest.mock('@/utils/bee', () => ({
  makeFeedIdentifier: () => ({
    toHex: () => 'feedhex',
  }),
}));
jest.mock('@/utils/config', () => ({
  config: {
    readerBeeUrl: 'http://mockbee',
  },
}));
jest.mock('@ethersphere/bee-js', () => ({
  Topic: { fromString: (s: string) => s },
  FeedIndex: { fromBigInt: () => ({}) },
}));

describe('StreamList', () => {
  it('renders the stream list title', () => {
    render(<StreamList />);
    expect(screen.getByText(/Choose a stream!/i)).toBeInTheDocument();
  });

  it('renders all StreamPreview components for streams', () => {
    render(<StreamList />);
    const previews = screen.getAllByTestId('stream-preview');
    expect(previews.length).toBe(2);
    expect(screen.getByText('Live Stream')).toBeInTheDocument();
    expect(screen.getByText('Ended Stream')).toBeInTheDocument();
  });

  it('renders live streams first', () => {
    render(<StreamList />);
    const previews = screen.getAllByTestId('stream-preview');
    expect(previews[0]).toHaveTextContent('Live Stream');
    expect(previews[1]).toHaveTextContent('Ended Stream');
  });
});
