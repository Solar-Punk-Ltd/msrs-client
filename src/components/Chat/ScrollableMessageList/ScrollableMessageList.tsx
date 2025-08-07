import React, { useEffect, useRef } from 'react';

import { VisibleMessage } from '@/hooks/useSwarmChat';

import './ScrollableMessageList.scss';

interface ScrollableMessageListProps {
  items: VisibleMessage[];
  renderItem: (item: VisibleMessage, onHeightChange: () => void) => React.ReactNode;
}

export function ScrollableMessageList({ items, renderItem }: ScrollableMessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousItemsLengthRef = useRef<number>(0);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  const isNearBottom = () => {
    if (!containerRef.current) return true;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const threshold = 50; // pixels from bottom
    return scrollTop + clientHeight >= scrollHeight - threshold;
  };

  const handleHeightChange = () => {
    if (isNearBottom()) {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  };

  useEffect(() => {
    const count = items.length;

    if (count > previousItemsLengthRef.current || isNearBottom()) {
      previousItemsLengthRef.current = count;

      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [items]);

  return (
    <div className="chat-messages-container" ref={containerRef}>
      {items.map((item) => renderItem(item, handleHeightChange))}
    </div>
  );
}
