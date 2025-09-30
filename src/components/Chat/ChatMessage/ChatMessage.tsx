import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import { ReactionData } from '@/hooks/useSwarmChat';

import { MessageActions } from './MessageActions/MessageActions';
import { MessageReactionsWrapper } from './MessageReactionsWrapper/MessageReactionsWrapper';
import { MessageThreadWrapper } from './MessageThreadWrapper/MessageThreadWrapper';
import { ProfilePicture } from './ProfilePicture/ProfilePicture';

import './ChatMessage.scss';

interface ChatMessageProps {
  message: string;
  name: string;
  profileColor: string;
  ownMessage?: boolean;
  messageOwnerAddress: string;
  received: boolean;
  error: boolean;
  uploaded?: boolean;
  requested?: boolean;
  reactions?: ReactionData[];
  threadCount?: number;
  onEmojiReaction: (emoji: string) => void;
  onRetry?: () => void;
  onThreadReply?: () => void;
  onHeightChange?: () => void;
  isReactionLoading?: boolean;
  loadingReactionEmoji?: string;
  disabled?: boolean;
  isLoggedIn?: boolean;
}

interface MessageStatus {
  received: boolean;
  error: boolean;
  uploaded: boolean;
  ownMessage: boolean;
  isNewMessage: boolean;
}

const MESSAGE_TIMEOUT = 20000;

const useMessageTimeout = (status: MessageStatus, onHeightChange?: () => void) => {
  const [isStuck, setIsStuck] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearCurrentTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetStuckState = useCallback(() => {
    setIsStuck(false);
    clearCurrentTimeout();
  }, [clearCurrentTimeout]);

  useEffect(() => {
    const { uploaded, received, error, ownMessage, isNewMessage } = status;

    // Only start timeout for own messages that are newly sent
    if (ownMessage && isNewMessage && uploaded && !received && !error) {
      timeoutRef.current = setTimeout(() => {
        setIsStuck(true);
        // Notify parent component about height change when stuck button appears
        onHeightChange?.();
      }, MESSAGE_TIMEOUT);
    }

    if (received || error) {
      resetStuckState();
    }

    return clearCurrentTimeout;
  }, [status, clearCurrentTimeout, resetStuckState, onHeightChange]);

  return { isStuck, resetStuckState };
};

export function ChatMessage({
  message,
  name,
  profileColor,
  ownMessage = false,
  messageOwnerAddress,
  received,
  error,
  uploaded = false,
  requested: _requested = false,
  reactions = [],
  threadCount = 0,
  onRetry,
  onEmojiReaction,
  onThreadReply,
  onHeightChange,
  isReactionLoading = false,
  loadingReactionEmoji = '',
  disabled = false,
  isLoggedIn = false,
}: ChatMessageProps) {
  const isNewMessage = uploaded && !received;

  const messageStatus: MessageStatus = {
    received,
    error,
    uploaded,
    ownMessage,
    isNewMessage,
  };
  const { isStuck, resetStuckState } = useMessageTimeout(messageStatus, onHeightChange);
  const [haveActionsOpened, setHaveActionsOpened] = useState(false);

  const handleRetry = useCallback(() => {
    if (!onRetry) return;

    resetStuckState();
    onRetry();
  }, [onRetry, resetStuckState]);

  const onMessageClick = () => {
    if (!isLoggedIn) return;
    setHaveActionsOpened((prev) => !prev);
  };

  return (
    <div className={clsx('chat-message', { 'own-message': ownMessage })} onClick={onMessageClick}>
      <ProfilePicture name={name} address={messageOwnerAddress} color={profileColor} ownMessage={ownMessage} />

      <div
        className={clsx('chat-message-text', {
          'chat-message-error': error,
          'chat-message-stuck': isStuck,
          'not-received': !received,
        })}
      >
        <span className="message">{message}</span>

        {error && onRetry && (
          <button className="retry-button" onClick={handleRetry}>
            Retry
          </button>
        )}

        {isStuck && onRetry && (
          <button className="retry-button stuck" onClick={handleRetry}>
            Resend
          </button>
        )}

        <MessageReactionsWrapper
          reactions={reactions}
          onEmojiClick={onEmojiReaction}
          ownMessage={ownMessage}
          isLoading={isReactionLoading}
          loadingEmoji={loadingReactionEmoji}
          disabled={disabled}
          isLoggedIn={isLoggedIn}
        />

        <MessageThreadWrapper threadCount={threadCount} onThreadClick={onThreadReply} disabled={disabled} />
      </div>

      <MessageActions
        visible={haveActionsOpened && received && !error}
        onEmojiClick={onEmojiReaction}
        onThreadClick={onThreadReply}
        ownMessage={ownMessage}
        isReactionLoading={isReactionLoading}
        disabled={disabled}
      />
    </div>
  );
}
