import { useState } from 'react';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { useUserContext } from '@/providers/User';

import './NameSetterModal.scss';

interface NameSetterModalProps {
  onClose: () => void;
}

export function NameSetterModal({ onClose }: NameSetterModalProps) {
  const { nickname, setNickname, setIsUserLoggedIn } = useUserContext();
  const [localName, setLocalName] = useState(nickname || '');
  const handleOkClick = () => {
    if (localName && localName.length > 0 && localName.length <= 20) {
      setNickname(localName);
      setIsUserLoggedIn(true);
      onClose();
    }
  };

  return (
    <div className="name-setter-container" role="main-layout">
      <div className="name-setter-modal">
        <div className="name-setter-modal-header">Chat</div>
        <div className="name-setter-modal-content">Please add your nickname for the chat!</div>
        <div className="name-setter-modal-input-container">
          <div className="name-setter-modal-input-nickname">Nickname: </div>
          <input
            value={localName || ''}
            className="name-setter-modal-input"
            onChange={(e) => setLocalName(e.target.value)}
          />
        </div>
        <div className="name-setter-modal-button-container">
          <Button className="name-setter-button" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button className="name-setter-button" variant={ButtonVariant.SECONDARY} onClick={() => handleOkClick()}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
