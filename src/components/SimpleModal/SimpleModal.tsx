import React from 'react';
import { createPortal } from 'react-dom';

import { Button, ButtonVariant } from '@/components/Button/Button';

import './SimpleModal.scss';

interface SimpleModalProps {
  isOpen: boolean;
  title: string;
  children: React.ReactNode;
  closeText?: string;
  onClose: () => void;
}

export function SimpleModal({ isOpen, title, children, closeText = 'Close', onClose }: SimpleModalProps) {
  if (!isOpen) return null;

  const modalContent = (
    <div className="simple-modal-overlay" onClick={onClose}>
      <div className="simple-modal" onClick={(e) => e.stopPropagation()}>
        <div className="simple-modal-header">{title}</div>
        <div className="simple-modal-content">{children}</div>
        <div className="simple-modal-button-container">
          <Button variant={ButtonVariant.PRIMARY} onClick={onClose} className="simple-modal-button primary">
            {closeText}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
