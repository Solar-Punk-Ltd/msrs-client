import { Button } from '@/components/Button/Button';
import { ChatMessage } from '@/components/Chat/ChatMessage/ChatMessage';
import { MessageSender } from '@/components/Chat/MessageSender/MessageSender';
import { ScrollableMessageList } from '@/components/Chat/ScrollableMessageList/ScrollableMessageList';
import { ReactionData, VisibleMessage } from '@/hooks/useSwarmChat';

import './ThreadView.scss';

interface ThreadViewProps {
  originalMessage: VisibleMessage;
  originalMessageReactions: ReactionData[];
  threadMessages: VisibleMessage[];
  groupedReactions: Record<string, ReactionData[]>;
  onBack: () => void;
  onSendMessage: (message: string) => void;
  onEmojiReaction: (messageId: string, emoji: string) => void;
  onRetry: (message: VisibleMessage) => void;
  getColorForName: (name: string) => string;
  currentUserAddress: string;
  reactionLoadingState?: Record<string, string>;
  disabled?: boolean;
  onLoginPrompt?: () => void;
}

export function ThreadView({
  originalMessage,
  originalMessageReactions,
  threadMessages,
  groupedReactions,
  onBack,
  onSendMessage,
  onEmojiReaction,
  onRetry,
  getColorForName,
  currentUserAddress,
  reactionLoadingState = {},
  disabled = false,
  onLoginPrompt,
}: ThreadViewProps) {
  return (
    <div className="thread-view">
      <div className="thread-header">
        <div className="thread-title-container">
          <Button onClick={onBack} className="back-button">
            ←
          </Button>
          <h3 className="thread-title">Thread</h3>
        </div>

        <div className="original-message-container">
          <ChatMessage
            key={originalMessage.id}
            message={originalMessage.message}
            received={Boolean(originalMessage.received)}
            error={Boolean(originalMessage.error)}
            uploaded={Boolean(originalMessage.uploaded)}
            requested={Boolean(originalMessage.requested)}
            name={originalMessage.username}
            messageOwnerAddress={originalMessage.address}
            profileColor={getColorForName(originalMessage.username)}
            ownMessage={originalMessage.address === currentUserAddress}
            reactions={originalMessageReactions}
            onEmojiReaction={(emoji) => onEmojiReaction(originalMessage.id, emoji)}
            onRetry={() => onRetry(originalMessage)}
            isReactionLoading={Object.keys(reactionLoadingState).some((key) => key.startsWith(originalMessage.id))}
            loadingReactionEmoji={
              Object.entries(reactionLoadingState).find(([key]) => key.startsWith(originalMessage.id))?.[1] || ''
            }
            disabled={disabled}
            isLoggedIn={Boolean(currentUserAddress)}
          />
        </div>
      </div>

      <div className="thread-messages-container">
        {threadMessages.length > 0 ? (
          <ScrollableMessageList
            items={threadMessages}
            renderItem={(item, onHeightChange) => (
              <ChatMessage
                key={item.id}
                message={item.message}
                received={Boolean(item.received)}
                error={Boolean(item.error)}
                uploaded={Boolean(item.uploaded)}
                requested={Boolean(item.requested)}
                name={item.username}
                messageOwnerAddress={item.address}
                profileColor={getColorForName(item.username)}
                ownMessage={item.address === currentUserAddress}
                reactions={groupedReactions[item.id] || []}
                onEmojiReaction={(emoji) => onEmojiReaction(item.id, emoji)}
                onRetry={() => onRetry(item)}
                onHeightChange={onHeightChange}
                isReactionLoading={Object.keys(reactionLoadingState).some((key) => key.startsWith(item.id))}
                loadingReactionEmoji={
                  Object.entries(reactionLoadingState).find(([key]) => key.startsWith(item.id))?.[1] || ''
                }
                disabled={disabled}
                isLoggedIn={Boolean(currentUserAddress)}
              />
            )}
          />
        ) : (
          <div className="no-thread-messages">No replies yet.</div>
        )}
      </div>

      {!currentUserAddress && onLoginPrompt && (
        <Button onClick={onLoginPrompt} className="chat-login-prompt">
          Please log in to send messages.
        </Button>
      )}
      {currentUserAddress && <MessageSender onSend={onSendMessage} disabled={disabled} />}
    </div>
  );
}
