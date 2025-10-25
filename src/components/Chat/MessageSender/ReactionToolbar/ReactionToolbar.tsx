import { useEffect, useState } from 'react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

import { EMOJI_PICKER_CONFIG, getResponsivePickerDimensions, PickerDimensions } from '@/utils/ui/emojiPicker';

import './ReactionToolbar.scss';

interface ReactionToolbarProps {
  onEmojiSelect?: (emoji: string) => void;
}

export function ReactionToolbar({ onEmojiSelect }: ReactionToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [pickerKey, setPickerKey] = useState(0);
  const [pickerDimensions, setPickerDimensions] = useState<PickerDimensions>({ width: 300, height: 350 });

  useEffect(() => {
    const handleExpandButtonClick = () => {
      const dimensions = getResponsivePickerDimensions();
      setPickerDimensions(dimensions);
      setIsExpanded(true);
    };

    const observer = new MutationObserver(() => {
      const expandButton = document.querySelector('button[aria-label="Show all Emojis"]');

      if (expandButton && !expandButton.hasAttribute('data-listener-added')) {
        expandButton.setAttribute('data-listener-added', 'true');
        expandButton.addEventListener('click', handleExpandButtonClick);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect?.(emojiData.emoji);
  };

  const handleCloseClick = () => {
    setIsExpanded(false);
    setPickerKey((prev) => prev + 1);
  };

  return (
    <div className={`reaction-toolbar ${isExpanded ? 'expanded' : ''}`}>
      {isExpanded && (
        <button className="close-picker-button" onClick={handleCloseClick}>
          ✕
        </button>
      )}

      <EmojiPicker
        {...EMOJI_PICKER_CONFIG}
        key={pickerKey}
        reactionsDefaultOpen={true}
        onEmojiClick={handleEmojiClick}
        width={isExpanded ? pickerDimensions.width : undefined}
        height={isExpanded ? pickerDimensions.height : undefined}
      />
    </div>
  );
}
