import { useCallback, useMemo, useRef, useState } from 'react';
import { ChatSettings, EVENTS, MessageData, MessageType, SwarmChat } from '@solarpunkltd/swarm-chat-js';

import { useWakuContext } from '@/providers/Waku';
import { MessageReceiveMode } from '@/types/messaging';
import { config } from '@/utils/shared/config';
import { WakuTransport } from '@/utils/waku/WakuChatTransport';

import { useSerializedEffect } from './useSerializedEffect';

export interface VisibleMessage extends MessageData {
  requested?: boolean;
  uploaded?: boolean;
  received?: boolean;
  error?: boolean;
}

export interface ReactionData {
  emoji: string;
  count: number;
  users: string[];
  hasUserReacted: boolean;
}

const processReactions = (
  reactionMessages: MessageData[],
  currentUserNickname: string,
): Record<string, ReactionData[]> => {
  const reactionGroups: Record<string, Record<string, Record<string, number>>> = {};

  reactionMessages.forEach((reaction) => {
    const { targetMessageId: targetId, message: emoji, username } = reaction;

    if (!targetId) return;

    reactionGroups[targetId] ??= {};
    reactionGroups[targetId][emoji] ??= {};
    reactionGroups[targetId][emoji][username] = (reactionGroups[targetId][emoji][username] || 0) + 1;
  });

  // Calculate active reactions (odd counts mean active)
  const result: Record<string, ReactionData[]> = {};

  Object.entries(reactionGroups).forEach(([targetId, emojis]) => {
    const reactions: ReactionData[] = [];

    Object.entries(emojis).forEach(([emoji, users]) => {
      const activeUsers = Object.entries(users)
        .filter(([, count]) => count % 2 === 1)
        .map(([username]) => username);

      if (activeUsers.length > 0) {
        reactions.push({
          emoji,
          count: activeUsers.length,
          users: activeUsers,
          hasUserReacted: activeUsers.includes(currentUserNickname),
        });
      }
    });

    if (reactions.length > 0) {
      result[targetId] = reactions;
    }
  });

  return result;
};

export const useSwarmChat = ({ user, infra }: ChatSettings) => {
  const chatRef = useRef<SwarmChat | null>(null);
  const { channelManager } = useWakuContext();

  const [messages, setMessages] = useState<VisibleMessage[]>([]);
  const [chatLoading, setChatLoading] = useState<boolean>(true);
  const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
  const [error, setError] = useState<any | null>(null);

  const messagesByType = useMemo(() => {
    const simple: VisibleMessage[] = [];
    const reactions: MessageData[] = [];
    const threads: VisibleMessage[] = [];

    messages.forEach((msg) => {
      switch (msg.type) {
        case MessageType.TEXT:
          simple.push(msg);
          break;
        case MessageType.REACTION:
          if (msg.targetMessageId) reactions.push(msg);
          break;
        case MessageType.THREAD:
          threads.push(msg);
          break;
      }
    });

    return { simple, reactions, threads };
  }, [messages]);

  const groupedReactions = useMemo(
    () => processReactions(messagesByType.reactions, user.nickname),
    [messagesByType.reactions, user.nickname],
  );

  const getThreadMessages = useCallback(
    (parentMessageId: string) => {
      const threadMessages = messagesByType.threads
        .filter((msg) => msg.targetMessageId === parentMessageId)
        .sort((a, b) => a.timestamp - b.timestamp);

      return {
        messages: threadMessages,
        count: threadMessages.length,
      };
    },
    [messagesByType.threads],
  );

  useSerializedEffect(
    'swarm-chat',
    async (isMounted) => {
      const messageReceiveMode = config.messageReceiveMode;
      const shouldUseWaku =
        messageReceiveMode === MessageReceiveMode.WAKU || messageReceiveMode === MessageReceiveMode.BOTH;
      const shouldUsePolling =
        messageReceiveMode === MessageReceiveMode.SWARM || messageReceiveMode === MessageReceiveMode.BOTH;

      if (shouldUseWaku && !channelManager) {
        console.log('⏭️  Waku is required but channel manager not available yet');

        if (chatRef.current) {
          const chatToCleanup = chatRef.current;
          chatRef.current = null;

          try {
            await chatToCleanup.stop();
          } catch (err) {
            console.error('Error stopping chat:', err);
          }

          // Reset state
          if (isMounted()) {
            setMessages([]);
            setChatLoading(true);
            setMessagesLoading(false);
            setError(null);
          }
        }

        return;
      }

      if (chatRef.current) {
        return;
      }

      let transport;
      if (shouldUseWaku && channelManager) {
        transport = new WakuTransport({
          channelManager,
          chatTopic: infra.chatTopic,
        });
      }

      const updatedInfra = {
        ...infra,
        enableFallbackPolling: shouldUsePolling,
        fallbackPollingInterval: 4000,
      };

      const chat = new SwarmChat({ user, infra: updatedInfra }, transport);

      if (!isMounted()) {
        console.log('⏭️  Unmounted during instantiation');
        await chat.stop();
        return;
      }

      chatRef.current = chat;

      const { on } = chat.getEmitter();

      const createSafeHandler = (updates: Partial<VisibleMessage>) => (data: MessageData | string) => {
        if (!isMounted() || chatRef.current !== chat) {
          return;
        }

        const messageData = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('Message event:', messageData, updates);

        setMessages((prevMessages) => {
          const existingIndex = prevMessages.findIndex((msg) => msg.id === messageData.id);
          let updatedMessages: VisibleMessage[];

          if (existingIndex !== -1) {
            updatedMessages = [...prevMessages];
            updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], ...messageData, ...updates };
          } else {
            updatedMessages = [...prevMessages, { ...messageData, ...updates }];
          }

          return chat.orderMessages?.(updatedMessages) ?? updatedMessages;
        });
      };

      const safeChatLoading = (loading: boolean) => {
        if (isMounted() && chatRef.current === chat) {
          setChatLoading(loading);
        }
      };
      const safeMessagesLoading = (loading: boolean) => {
        if (isMounted() && chatRef.current === chat) {
          setMessagesLoading(loading);
        }
      };
      const safeError = (err: any) => {
        if (isMounted() && chatRef.current === chat) {
          setError(err);
        }
      };

      // Register event handlers
      on(EVENTS.MESSAGE_REQUEST_INITIATED, createSafeHandler({ error: false, requested: true }));
      on(EVENTS.MESSAGE_REQUEST_UPLOADED, createSafeHandler({ error: false, uploaded: true }));
      on(EVENTS.MESSAGE_RECEIVED, createSafeHandler({ error: false, received: true }));
      on(EVENTS.MESSAGE_REQUEST_ERROR, createSafeHandler({ error: true }));
      on(EVENTS.LOADING_INIT, safeChatLoading);
      on(EVENTS.LOADING_PREVIOUS_MESSAGES, safeMessagesLoading);
      on(EVENTS.CRITICAL_ERROR, safeError);

      try {
        await chat.start();

        if (!isMounted() || chatRef.current !== chat) {
          console.log('⏭️  Invalid state after start, stopping');
          await chat.stop();

          if (chatRef.current === chat) {
            chatRef.current = null;
          }
          return;
        }
      } catch (err) {
        console.error('Failed to start chat:', err);

        if (chatRef.current === chat) {
          chatRef.current = null;
        }

        throw err;
      }
    },
    async () => {
      if (chatRef.current) {
        const chatToStop = chatRef.current;
        chatRef.current = null;

        try {
          await chatToStop.stop();
        } catch (err) {
          console.error('Error stopping chat:', err);
        }
      }
    },
    [user.privateKey, channelManager],
  );

  const sendMessage = useCallback(
    (message: string, additionalProps?: any) =>
      chatRef.current?.sendMessage(message, MessageType.TEXT, undefined, undefined, additionalProps),
    [],
  );

  const sendReaction = useCallback(
    (targetMessageId: string, emoji: string, additionalProps?: any) =>
      chatRef.current?.sendMessage(emoji, MessageType.REACTION, targetMessageId, undefined, additionalProps),
    [],
  );

  const sendReply = useCallback(
    (parentMessageId: string, message: string, additionalProps?: any) =>
      chatRef.current?.sendMessage(message, MessageType.THREAD, parentMessageId, undefined, additionalProps),
    [],
  );

  const hasPreviousMessages = useCallback(() => chatRef.current?.hasPreviousMessages(), []);

  const fetchPreviousMessages = useCallback(() => chatRef.current?.fetchPreviousMessages(), []);

  const retrySendMessage = useCallback((message: VisibleMessage) => {
    if (!chatRef.current) return;

    const { requested, error, uploaded } = message;

    if (error) {
      chatRef.current.retrySendMessage(message);
    } else if (requested && uploaded) {
      chatRef.current.retryBroadcastUserMessage(message);
    }
  }, []);

  return {
    // Loading states
    chatLoading,
    messagesLoading,
    error,

    // Messages
    allMessages: messages,
    simpleMessages: messagesByType.simple,
    threadMessages: messagesByType.threads,
    reactionMessages: messagesByType.reactions,
    groupedReactions,
    getThreadMessages,

    // Actions
    sendMessage,
    sendReaction,
    sendReply,
    hasPreviousMessages,
    fetchPreviousMessages,
    retrySendMessage,
  };
};
