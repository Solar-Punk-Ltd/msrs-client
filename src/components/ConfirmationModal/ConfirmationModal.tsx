import { createPortal } from 'react-dom';

import { Button, ButtonVariant } from '../Button/Button';

import './ConfirmationModal.scss';

const DEFAULT_CONFIRM_TEXT = 'Confirm';
const DEFAULT_CANCEL_TEXT = 'Cancel';
const DEFAULT_LOADING_TEXT = 'Processing...';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  loadingText?: string;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = DEFAULT_CONFIRM_TEXT,
  cancelText = DEFAULT_CANCEL_TEXT,
  onConfirm,
  onCancel,
  isLoading = false,
  loadingText = DEFAULT_LOADING_TEXT,
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
            {isLoading ? loadingText : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
