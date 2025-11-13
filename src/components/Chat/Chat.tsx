import { useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ChatMessage } from '@/components/Chat/ChatMessage/ChatMessage';
import { MessageSender } from '@/components/Chat/MessageSender/MessageSender';
import { ScrollableMessageList } from '@/components/Chat/ScrollableMessageList/ScrollableMessageList';
import { ThreadView } from '@/components/Chat/ThreadView/ThreadView';
import { useSwarmChat, VisibleMessage } from '@/hooks/useSwarmChat';
import { useUserContext } from '@/providers/User';
import { useWakuContext } from '@/providers/Waku';
import { MessageReceiveMode } from '@/types/messaging';
import { config } from '@/utils/shared/config';

import './Chat.scss';

interface ChatProps {
  owner: string;
  topic: string;
  isExternal?: boolean;
}

const profileColors = [
  '#DC2626', // Dark Red
  '#D97706', // Dark Amber
  '#059669', // Dark Emerald
  '#2563EB', // Dark Blue
  '#EA580C', // Dark Orange
  '#9333EA', // Dark Purple
  '#BE123C', // Dark Rose
  '#0D9488', // Dark Teal
  '#7C3AED', // Dark Violet
  '#0284C7', // Dark Cyan
  '#C026D3', // Dark Magenta
  '#CA8A04', // Dark Yellow
  '#0891B2', // Dark Sky
  '#DB2777', // Dark Pink
  '#15803D', // Dark Green
  '#4F46E5', // Dark Indigo
];

function getColorForName(name: string): string {
  const hash = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return profileColors[hash % profileColors.length];
}

const privKeyPlaceholder = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

export const Chat: React.FC<ChatProps> = ({ owner, topic, isExternal = false }) => {
  const { node, channelManager } = useWakuContext();
  const { nickname, keys, setIsLoginModalOpen } = useUserContext();

  const [selectedMessage, setSelectedMessage] = useState<VisibleMessage | null>(null);
  const [isThreadView, setIsThreadView] = useState(false);
  const [reactionLoadingState, setReactionLoadingState] = useState<Record<string, string>>({});
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSendingThreadMessage, setIsSendingThreadMessage] = useState(false);

  const messageReceiveMode = config.messageReceiveMode;
  const isWakuRequired =
    messageReceiveMode === MessageReceiveMode.WAKU || messageReceiveMode === MessageReceiveMode.BOTH;
  const wakuNodeLoading = isWakuRequired && (!node || !channelManager);

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
      privateKey: keys.private || privKeyPlaceholder,
    },
    infra: {
      beeUrl: config.writerBeeUrl,
      gsocResourceId: config.chatGsocResourceId,
      gsocTopic: config.chatGsocTopic,
      chatAddress: config.streamStateOwner,
      chatTopic: `chat-${topic}`,
      enveloped: false,
      feedReadTimeout: 12500,
      gsocWriteTimeout: 5000,
      socReadTimeout: 5000,
    },
  });

  const handleMessageSending = async (text: string) => {
    try {
      setIsSendingMessage(true);
      await sendMessage(text, {
        streamId: `${owner}/${topic}`,
        isExternal,
      });
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
      await sendReaction(messageId, emoji, {
        streamId: `${owner}/${topic}`,
        isExternal,
      });
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
        await sendReply(selectedMessage.id, text, {
          streamId: `${owner}/${topic}`,
          isExternal,
        });
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
          currentUserAddress={keys.public || ''}
          reactionLoadingState={reactionLoadingState}
          disabled={isAnyOperationLoading}
          onLoginPrompt={() => setIsLoginModalOpen(true)}
        />
      ) : (
        <>
          {(wakuNodeLoading || chatLoading) && (
            <div className="chat-loading-overlay">
              <div className="chat-loading">Loading chat...</div>
            </div>
          )}
          {!wakuNodeLoading && !chatLoading && hasPreviousMessages() && (
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
                  messageOwnerAddress={item.address}
                  ownMessage={item.address === keys.public!}
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
                  isLoggedIn={Boolean(keys.public)}
                />
              )}
            />
          )}

          {!wakuNodeLoading && !chatLoading && !keys.public && (
            <Button onClick={() => setIsLoginModalOpen(true)} className="chat-login-prompt">
              Please log in to send messages.
            </Button>
          )}
          {!wakuNodeLoading && !chatLoading && keys.public && (
            <MessageSender onSend={handleMessageSending} disabled={isAnyOperationLoading} />
          )}
        </>
      )}
    </div>
  );
};
