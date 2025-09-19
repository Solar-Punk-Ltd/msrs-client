import './StreamActionButton.scss';

interface StreamActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: 'edit' | 'delete' | 'token' | 'pin' | 'unpin';
}

export function StreamActionButton({ onClick, icon, label, variant = 'edit' }: StreamActionButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <button
      className={`stream-action-button stream-action-button--${variant}`}
      onClick={handleClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}
