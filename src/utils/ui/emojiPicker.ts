import { EmojiStyle, Theme } from 'emoji-picker-react';

export const EMOJI_PICKER_CONFIG = {
  theme: Theme.DARK,
  previewConfig: {
    showPreview: false,
  },
  lazyLoadEmojis: true,
  searchDisabled: false,
  skinTonesDisabled: true,
  emojiStyle: EmojiStyle.NATIVE,
  autoFocusSearch: false,
} as const;

export const BREAKPOINTS = {
  mobile: 640,
} as const;

export interface PickerDimensions {
  width: number;
  height: number;
}

export function getResponsivePickerDimensions(): PickerDimensions {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isMobile = screenWidth < BREAKPOINTS.mobile;

  return {
    width: isMobile ? Math.min(screenWidth - 32, 280) : 300,
    height: isMobile ? Math.min(screenHeight - 100, 300) : 350,
  };
}

export function isSafariBrowser(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export interface PickerPosition {
  top: number;
  left: number;
}

export function calculatePickerPosition(
  buttonRect: DOMRect,
  pickerDimensions: PickerDimensions,
  ownMessage: boolean = false,
): PickerPosition {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const isSafari = isSafariBrowser();

  let top = buttonRect.bottom + 4;
  let left = buttonRect.left;

  // For non-own messages, adjust left positioning
  if (!ownMessage) {
    left = buttonRect.right - pickerDimensions.width;
    if (left < 16) {
      left = buttonRect.left;
    }
  }

  // Check vertical positioning
  if (top + pickerDimensions.height > screenHeight) {
    top = buttonRect.top - pickerDimensions.height - 4;
    if (top < 16) {
      top = 16;
    }
  }

  // Check horizontal positioning
  if (left + pickerDimensions.width > screenWidth) {
    left = screenWidth - pickerDimensions.width - 16;
  }

  // Ensure minimum distance from edges
  top = Math.max(16, top);
  left = Math.max(16, left);

  if (isSafari) {
    top = Math.max(20, top);
    left = Math.max(20, Math.min(left, screenWidth - pickerDimensions.width - 20));
  }

  return { top, left };
}
