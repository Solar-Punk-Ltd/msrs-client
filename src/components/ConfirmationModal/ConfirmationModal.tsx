import { Button, ButtonVariant } from '@/components/Button/Button';

import './ConfirmationModal.scss';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="confirmation-modal-container" role="main-layout">
      <div className="confirmation-modal">
        <div className="confirmation-modal-header">{title}</div>
        <div className="confirmation-modal-content">{message}</div>

        <div className="confirmation-modal-button-container">
          <Button className="confirmation-modal-button" onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            className="confirmation-modal-button"
            variant={ButtonVariant.SECONDARY}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
