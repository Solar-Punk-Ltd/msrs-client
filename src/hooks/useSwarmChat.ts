import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatSettings, EVENTS, MessageData, MessageType, SwarmChat } from '@solarpunkltd/swarm-chat-js';

import { config } from '@/utils/config';

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

  const updateOrAddMessage = useCallback((newMessage: VisibleMessage) => {
    setMessages((prevMessages) => {
      const existingIndex = prevMessages.findIndex((msg) => msg.id === newMessage.id);

      let updatedMessages: VisibleMessage[];
      if (existingIndex !== -1) {
        // Update existing message
        updatedMessages = [...prevMessages];
        updatedMessages[existingIndex] = { ...updatedMessages[existingIndex], ...newMessage };
      } else {
        // Add new message
        updatedMessages = [...prevMessages, newMessage];
      }

      return chatRef.current?.orderMessages?.(updatedMessages) ?? updatedMessages;
    });
  }, []);

  const createMessageHandler = useCallback(
    (messageUpdates: Partial<VisibleMessage>) => (data: MessageData | string) => {
      const messageData = typeof data === 'string' ? JSON.parse(data) : data;
      updateOrAddMessage({ ...messageData, ...messageUpdates });
    },
    [updateOrAddMessage],
  );

  useEffect(() => {
    if (config.isWakuEnabled && infra.waku?.enabled && !infra.waku?.node) {
      return;
    }

    if (chatRef.current) return;

    const chat = new SwarmChat({ user, infra });
    chatRef.current = chat;

    const { on } = chat.getEmitter();

    // Message lifecycle events
    on(
      EVENTS.MESSAGE_REQUEST_INITIATED,
      createMessageHandler({
        error: false,
        requested: true,
      }),
    );
    on(
      EVENTS.MESSAGE_REQUEST_UPLOADED,
      createMessageHandler({
        error: false,
        uploaded: true,
      }),
    );
    on(
      EVENTS.MESSAGE_RECEIVED,
      createMessageHandler({
        error: false,
        received: true,
      }),
    );

    on(
      EVENTS.MESSAGE_REQUEST_ERROR,
      createMessageHandler({
        error: true,
      }),
    );

    // Loading and error states
    on(EVENTS.LOADING_INIT, setChatLoading);
    on(EVENTS.LOADING_PREVIOUS_MESSAGES, setMessagesLoading);
    on(EVENTS.CRITICAL_ERROR, setError);

    chat.start();

    return () => {
      chat.stop();
      chatRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.privateKey, infra.waku?.node, createMessageHandler]);

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
