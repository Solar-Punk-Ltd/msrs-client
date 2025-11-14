import { useEffect, useRef, useState } from 'react';

import { SendMessageIcon } from '@/components/Icons/SendMessageIcon';
import { InputLoading } from '@/components/InputLoading/InputLoading';

import { ReactionToolbar } from './ReactionToolbar/ReactionToolbar';

import './MessageSender.scss';

interface MessageSenderProps {
  onSend?: (text: string) => Promise<void> | void;
  disabled?: boolean;
}

export function MessageSender({ onSend, disabled = false }: MessageSenderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldRefocusRef = useRef(false);

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Only auto-focus if we explicitly set the flag during message send
    if (!sending && shouldRefocusRef.current) {
      shouldRefocusRef.current = false;
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [sending]);

  const handleEmojiSelect = (emoji: string) => {
    setInput((prev) => prev + emoji);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || disabled) return;

    try {
      setSending(true);
      shouldRefocusRef.current = true; // Set flag to refocus after send
      await onSend?.(input.trim());
      setInput('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="message-sender-wrapper">
      <div className="message-sender">
        {sending || disabled ? (
          <div className="message-sender-sending">
            <InputLoading />
          </div>
        ) : (
          <>
            <ReactionToolbar onEmojiSelect={handleEmojiSelect} />
            <div className="message-sender-input-wrapper">
              <input
                ref={inputRef}
                type="text"
                name="message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message"
                onKeyDown={handleKeyDown}
                className="message-sender-input"
              />
              <button className="message-sender-send-button" onClick={sendMessage}>
                <SendMessageIcon color={input.trim() ? '' : '#A5ADBA'} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
