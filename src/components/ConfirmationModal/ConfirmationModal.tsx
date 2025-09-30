import { createPortal } from 'react-dom';

import { Button, ButtonVariant } from '../Button/Button';

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

  const modalContent = (
    <div className="confirmation-modal-overlay" onClick={onCancel}>
      <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
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

  return createPortal(modalContent, document.body);
}
