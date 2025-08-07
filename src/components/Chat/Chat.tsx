import { useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ChatMessage } from '@/components/Chat/ChatMessage/ChatMessage';
import { MessageSender } from '@/components/Chat/MessageSender/MessageSender';
import { ScrollableMessageList } from '@/components/Chat/ScrollableMessageList/ScrollableMessageList';
import { ThreadView } from '@/components/Chat/ThreadView/ThreadView';
import { useSwarmChat, VisibleMessage } from '@/hooks/useSwarmChat';
import { useUserContext } from '@/providers/User';
import { config } from '@/utils/config';

import './Chat.scss';

interface ChatProps {
  topic: string;
}

const profileColors = [
  '#FF6B6B', // Coral Red
  '#FFD93D', // Golden Yellow
  '#6BCB77', // Soft Green
  '#4D96FF', // Bright Blue
  '#FFAD69', // Soft Orange
  '#C084FC', // Pastel Purple
  '#F87171', // Warm Salmon
  '#34D399', // Emerald
  '#FBBF24', // Amber
  '#60A5FA', // Sky Blue
];

function getColorForName(name: string): string {
  const hash = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return profileColors[hash % profileColors.length];
}

const privKeyPlaceholder = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export const Chat: React.FC<ChatProps> = ({ topic }) => {
  const { nickname, key, setIsNicknameModalOpen } = useUserContext();
  const [selectedMessage, setSelectedMessage] = useState<VisibleMessage | null>(null);
  const [isThreadView, setIsThreadView] = useState(false);
  const [reactionLoadingState, setReactionLoadingState] = useState<Record<string, string>>({});
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSendingThreadMessage, setIsSendingThreadMessage] = useState(false);

  const {
    chatLoading,
    messagesLoading,
    groupedReactions,
    simpleMessages,
    getThreadMessages,
    sendMessage,
    sendReaction,
    sendReply,
    fetchPreviousMessages,
    hasPreviousMessages,
    retrySendMessage,
    error,
  } = useSwarmChat({
    user: {
      nickname: nickname || '',
      privateKey: key.private || privKeyPlaceholder,
    },
    infra: {
      beeUrl: config.writerBeeUrl,
      gsocResourceId: config.chatGsocResourceId,
      gsocTopic: config.chatGsocTopic,
      chatAddress: config.appOwner,
      chatTopic: `chat-${topic}`,
      enveloped: false,
    },
  });

  const handleMessageSending = async (text: string) => {
    try {
      setIsSendingMessage(true);
      await sendMessage(text);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleEmojiReaction = async (messageId: string, emoji: string) => {
    // Prevent multiple reactions on the same message-emoji combination
    const loadingKey = `${messageId}-${emoji}`;
    if (reactionLoadingState[loadingKey]) return;

    try {
      setReactionLoadingState((prev) => ({ ...prev, [loadingKey]: emoji }));
      await sendReaction(messageId, emoji);
    } finally {
      // Clear loading state after a short delay to prevent rapid clicking
      setTimeout(() => {
        setReactionLoadingState((prev) => {
          const { [loadingKey]: _, ...rest } = prev;
          return rest;
        });
      }, 500);
    }
  };

  const handleThreadReply = (message: VisibleMessage) => {
    setSelectedMessage(message);
    setIsThreadView(true);
  };

  const handleBackToMain = () => {
    setIsThreadView(false);
    setSelectedMessage(null);
  };

  const handleThreadMessageSending = async (text: string) => {
    if (selectedMessage) {
      try {
        setIsSendingThreadMessage(true);
        await sendReply(selectedMessage.id, text);
      } finally {
        setIsSendingThreadMessage(false);
      }
    }
  };

  const isAnyOperationLoading =
    Object.keys(reactionLoadingState).length > 0 || isSendingMessage || isSendingThreadMessage;

  if (error) {
    return (
      <div className="chat-container">
        <div className="chat-error">Critical error: {error.message}. Please check node availability status.</div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {isThreadView && selectedMessage ? (
        <ThreadView
          originalMessage={selectedMessage}
          originalMessageReactions={groupedReactions[selectedMessage.id] || []}
          threadMessages={getThreadMessages(selectedMessage.id).messages}
          groupedReactions={groupedReactions}
          onBack={handleBackToMain}
          onSendMessage={handleThreadMessageSending}
          onEmojiReaction={handleEmojiReaction}
          onRetry={retrySendMessage}
          getColorForName={getColorForName}
          currentUserAddress={key.public || ''}
          reactionLoadingState={reactionLoadingState}
          disabled={isAnyOperationLoading}
          onLoginPrompt={() => setIsNicknameModalOpen(true)}
        />
      ) : (
        <>
          {chatLoading && (
            <div className="chat-loading-overlay">
              <div className="chat-loading">Loading chat...</div>
            </div>
          )}
          {!chatLoading && hasPreviousMessages() && (
            <Button onClick={fetchPreviousMessages} className="chat-load-more">
              Load more messages
            </Button>
          )}

          {messagesLoading && <div className="chat-loading">Loading messages...</div>}
          {!messagesLoading && simpleMessages.length > 0 && (
            <ScrollableMessageList
              items={simpleMessages}
              renderItem={(item, onHeightChange) => (
                <ChatMessage
                  key={item.id}
                  message={item.message}
                  received={Boolean(item.received)}
                  error={Boolean(item.error)}
                  uploaded={Boolean(item.uploaded)}
                  requested={Boolean(item.requested)}
                  name={item.username}
                  profileColor={getColorForName(item.username)}
                  ownMessage={item.address === key.public!}
                  reactions={groupedReactions[item.id] || []}
                  threadCount={getThreadMessages(item.id).count}
                  onRetry={() => retrySendMessage(item)}
                  onEmojiReaction={(emoji) => handleEmojiReaction(item.id, emoji)}
                  onThreadReply={() => handleThreadReply(item)}
                  onHeightChange={onHeightChange}
                  isReactionLoading={Object.keys(reactionLoadingState).some((key) => key.startsWith(item.id))}
                  loadingReactionEmoji={
                    Object.entries(reactionLoadingState).find(([key]) => key.startsWith(item.id))?.[1] || ''
                  }
                  disabled={isAnyOperationLoading}
                  isLoggedIn={Boolean(key.public)}
                />
              )}
            />
          )}

          {!chatLoading && !key.public && (
            <Button onClick={() => setIsNicknameModalOpen(true)} className="chat-login-prompt">
              Please log in to send messages.
            </Button>
          )}
          {!chatLoading && key.public && (
            <MessageSender onSend={handleMessageSending} disabled={isAnyOperationLoading} />
          )}
        </>
      )}
    </div>
  );
};
