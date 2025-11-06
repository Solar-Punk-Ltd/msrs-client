import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessageSender } from './MessageSender';

// Mock the ReactionToolbar component to avoid emoji picker issues in tests
vi.mock('./ReactionToolbar/ReactionToolbar', () => ({
  ReactionToolbar: ({ onEmojiSelect }: { onEmojiSelect?: (emoji: string) => void }) => (
    <div data-testid="reaction-toolbar">
      <button onClick={() => onEmojiSelect?.('😀')} data-testid="emoji-button">
        😀
      </button>
    </div>
  ),
}));

describe('MessageSender', () => {
  it('renders input and send button', () => {
    render(<MessageSender />);
    expect(screen.getByPlaceholderText(/type a message/i)).toBeInTheDocument();
    expect(document.querySelector('.message-sender-send-button')).toBeInTheDocument();
  });

  it('calls onSend with trimmed input when send button is clicked', async () => {
    const onSend = vi.fn();
    render(<MessageSender onSend={onSend} />);
    const input = screen.getByPlaceholderText(/type a message/i);
    const button = document.querySelector('.message-sender-send-button') as HTMLButtonElement;

    fireEvent.change(input, { target: { value: '   hello world   ' } });
    fireEvent.click(button);

    await waitFor(() => expect(onSend).toHaveBeenCalledWith('hello world'));
  });

  it('calls onSend when Enter is pressed', async () => {
    const onSend = vi.fn();
    render(<MessageSender onSend={onSend} />);
    const input = screen.getByPlaceholderText(/type a message/i);

    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(onSend).toHaveBeenCalledWith('test message'));
  });

  it('does not call onSend if input is empty or only whitespace', async () => {
    const onSend = vi.fn();
    render(<MessageSender onSend={onSend} />);
    const input = screen.getByPlaceholderText(/type a message/i);
    const button = document.querySelector('.message-sender-send-button') as HTMLButtonElement;

    fireEvent.change(input, { target: { value: '    ' } });
    fireEvent.click(button);

    await waitFor(() => expect(onSend).not.toHaveBeenCalled());
  });

  it('adds emoji to input when emoji is selected', async () => {
    render(<MessageSender />);
    const input = screen.getByPlaceholderText(/type a message/i);
    const emojiButton = screen.getByTestId('emoji-button');

    fireEvent.change(input, { target: { value: 'Hello ' } });
    fireEvent.click(emojiButton);

    expect(input).toHaveValue('Hello 😀');
  });
});
