import { useState } from 'react';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { useUserContext } from '@/providers/User';

import './LoginModal.scss';

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
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
    <div className="login-modal-container" role="main-layout">
      <div className="login-modal">
        <div className="login-modal-header">Chat</div>
        <div className="login-modal-content">Please add your nickname for the chat!</div>
        <div className="login-modal-input-container">
          <div className="login-modal-input-nickname">Nickname: </div>
          <input value={localName || ''} className="login-modal-input" onChange={(e) => setLocalName(e.target.value)} />
        </div>
        <div className="login-modal-button-container">
          <Button className="login-modal-button" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button className="login-modal-button" variant={ButtonVariant.SECONDARY} onClick={() => handleOkClick()}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
