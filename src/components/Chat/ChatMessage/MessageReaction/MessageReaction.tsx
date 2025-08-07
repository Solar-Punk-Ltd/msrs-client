import clsx from 'clsx';

import './MessageReaction.scss';

interface MessageReactionProps {
  emoji: string;
  count: number;
  isUserReaction?: boolean;
  onClick?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  isLoggedIn?: boolean;
}

export function MessageReaction({
  emoji,
  count,
  isUserReaction = false,
  onClick,
  isLoading = false,
  disabled = false,
  isLoggedIn = false,
}: MessageReactionProps) {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isLoggedIn || isLoading || disabled) {
      return;
    }
    onClick?.();
  };

  return (
    <button
      className={clsx('message-reaction', {
        'user-reaction': isUserReaction,
        loading: isLoading,
        disabled: disabled,
        'not-logged-in': !isLoggedIn,
      })}
      onClick={handleClick}
      disabled={isLoading || disabled}
      title={
        disabled
          ? 'Reactions disabled while loading'
          : isLoading
          ? 'Sending reaction...'
          : `${count} reaction${count > 1 ? 's' : ''}`
      }
    >
      <span className="reaction-emoji">{isLoading ? '⏳' : emoji}</span>
      <span className="reaction-count">{count}</span>
    </button>
  );
}
