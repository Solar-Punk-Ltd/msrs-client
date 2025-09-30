import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChatMessage } from './ChatMessage';

describe('ChatMessage', () => {
  const baseProps = {
    message: 'Hello world!',
    name: 'Alice',
    messageOwnerAddress: 'address1',
    profileColor: '#ff0000',
    received: true,
    error: false,
    onEmojiReaction: vi.fn(),
  };

  it('renders the message text', () => {
    render(<ChatMessage {...baseProps} />);
    expect(screen.getByText('Hello world!')).toBeInTheDocument();
  });

  it('renders the user name in ProfilePicture', () => {
    render(<ChatMessage {...baseProps} />);
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('applies own-message class if ownMessage is true', () => {
    render(<ChatMessage {...baseProps} ownMessage={true} />);
    const container = screen.getByText('Hello world!').closest('.chat-message');
    expect(container?.className).toMatch(/own-message/);
  });

  it('shows retry button if error and onRetry are provided', () => {
    const onRetry = vi.fn();
    render(<ChatMessage {...baseProps} error={true} onRetry={onRetry} />);
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('applies chat-message-error class if error is true', () => {
    render(<ChatMessage {...baseProps} error={true} />);
    expect(screen.getByText('Hello world!').parentElement).toHaveClass('chat-message-error');
  });

  it('applies not-received class if received is false', () => {
    render(<ChatMessage {...baseProps} received={false} />);
    expect(screen.getByText('Hello world!').parentElement).toHaveClass('not-received');
  });
});
