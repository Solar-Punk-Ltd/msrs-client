import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

import { useClickOutside } from '@/hooks/useClickOutside';
import {
  calculatePickerPosition,
  EMOJI_PICKER_CONFIG,
  getResponsivePickerDimensions,
  PickerDimensions,
  PickerPosition,
} from '@/utils/ui/emojiPicker';

import './MessageActions.scss';

interface MessageActionsProps {
  onEmojiClick?: (emoji: string) => void;
  onThreadClick?: () => void;
  visible: boolean;
  ownMessage?: boolean;
  isReactionLoading?: boolean;
  disabled?: boolean;
}

export function MessageActions({
  onEmojiClick,
  onThreadClick,
  visible,
  ownMessage = false,
  isReactionLoading = false,
  disabled = false,
}: MessageActionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<PickerPosition>({ top: 0, left: 0 });
  const [pickerDimensions, setPickerDimensions] = useState<PickerDimensions>({ width: 300, height: 350 });
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) {
      setShowEmojiPicker(false);
    }
  }, [visible]);

  useClickOutside([emojiButtonRef, pickerRef], () => setShowEmojiPicker(false), showEmojiPicker);

  const handleEmojiButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (isReactionLoading || disabled) return;

    if (!showEmojiPicker && emojiButtonRef.current) {
      const buttonRect = emojiButtonRef.current.getBoundingClientRect();
      const dimensions = getResponsivePickerDimensions();
      const position = calculatePickerPosition(buttonRect, dimensions, ownMessage);

      setPickerDimensions(dimensions);
      setPickerPosition(position);
    }

    setShowEmojiPicker(!showEmojiPicker);
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (isReactionLoading || disabled) return;

    onEmojiClick?.(emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const isDisabled = isReactionLoading || disabled;

  return (
    <div
      className={clsx('message-actions', {
        visible,
        'own-message': ownMessage,
      })}
    >
      <div className="action-buttons">
        <button
          ref={emojiButtonRef}
          className="action-button emoji-button"
          onClick={handleEmojiButtonClick}
          disabled={isDisabled}
          title={
            disabled ? 'Reactions disabled while loading' : isReactionLoading ? 'Sending reaction...' : 'Add reaction'
          }
        >
          {isReactionLoading ? '⏳' : '😊'}
        </button>

        {!!onThreadClick && (
          <button
            className="action-button thread-button"
            onClick={(event) => {
              event.stopPropagation();
              if (!disabled) {
                onThreadClick();
              }
            }}
            disabled={disabled}
            title={disabled ? 'Replies disabled while loading' : 'Reply in thread'}
          >
            💬
          </button>
        )}
      </div>

      {showEmojiPicker &&
        createPortal(
          <div
            ref={pickerRef}
            className="emoji-picker-fixed"
            style={{
              position: 'fixed',
              top: pickerPosition.top,
              left: pickerPosition.left,
              zIndex: 99999,
              isolation: 'isolate',
              transform: 'translateZ(0)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <EmojiPicker
              {...EMOJI_PICKER_CONFIG}
              onEmojiClick={handleEmojiClick}
              width={pickerDimensions.width}
              height={pickerDimensions.height}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
