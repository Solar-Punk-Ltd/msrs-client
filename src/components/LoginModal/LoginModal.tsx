import { useState } from 'react';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { useUserContext } from '@/providers/User';

import './LoginModal.scss';

type LoginMode = 'nickname' | 'admin';

export function LoginModal() {
  const { nickname, loginAsAdmin, loginAsUser, setIsLoginModalOpen } = useUserContext();
  const [loginMode, setLoginMode] = useState<LoginMode>('nickname');
  const [localName, setLocalName] = useState(nickname || '');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNicknameLogin = async () => {
    if (localName && localName.length > 0 && localName.length <= 20) {
      setIsLoading(true);
      setError(null);

      try {
        await loginAsUser(localName);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed');
      } finally {
        setIsLoginModalOpen(false);
        setIsLoading(false);
      }
    } else {
      setError('Nickname must be between 1 and 20 characters');
    }
  };

  const handleAdminLogin = async () => {
    if (!adminUsername || !adminPassword) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await loginAsAdmin(adminUsername, adminPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoginModalOpen(false);
      setIsLoading(false);
    }
  };

  const renderNicknameLogin = () => (
    <>
      <div className="login-modal-header">Chat</div>
      <div className="login-modal-content">Please add your nickname for the chat!</div>

      {error && <div className="login-modal-error">{error}</div>}

      <div className="login-modal-input-container">
        <div className="login-modal-input-nickname">Nickname: </div>
        <input
          value={localName || ''}
          className="login-modal-input"
          onChange={(e) => setLocalName(e.target.value)}
          placeholder="Enter your nickname"
          disabled={isLoading}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleNicknameLogin();
            }
          }}
        />
      </div>
      <div className="login-modal-button-container">
        <Button className="login-modal-button" onClick={() => setIsLoginModalOpen(false)} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          className="login-modal-button"
          variant={ButtonVariant.SECONDARY}
          onClick={handleNicknameLogin}
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'OK'}
        </Button>
      </div>
      <div className="login-modal-mode-switch">
        <button className="login-modal-switch-link" onClick={() => setLoginMode('admin')} disabled={isLoading}>
          Admin Login
        </button>
      </div>
    </>
  );

  const renderAdminLogin = () => (
    <>
      <div className="login-modal-header">Admin Login</div>
      <div className="login-modal-content">Enter your admin credentials</div>

      {error && <div className="login-modal-error">{error}</div>}

      <div className="login-modal-input-container">
        <div className="login-modal-input-nickname">Username: </div>
        <input
          value={adminUsername}
          className="login-modal-input"
          onChange={(e) => setAdminUsername(e.target.value)}
          placeholder="Enter admin username"
          disabled={isLoading}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && adminPassword) {
              handleAdminLogin();
            }
          }}
        />
      </div>

      <div className="login-modal-input-container">
        <div className="login-modal-input-nickname">Password: </div>
        <input
          type="password"
          value={adminPassword}
          className="login-modal-input"
          onChange={(e) => setAdminPassword(e.target.value)}
          placeholder="Enter admin password"
          disabled={isLoading}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && adminUsername) {
              handleAdminLogin();
            }
          }}
        />
      </div>

      <div className="login-modal-button-container">
        <Button className="login-modal-button" onClick={() => setIsLoginModalOpen(false)} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          className="login-modal-button"
          variant={ButtonVariant.SECONDARY}
          onClick={handleAdminLogin}
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </Button>
      </div>

      <div className="login-modal-mode-switch">
        <button className="login-modal-switch-link" onClick={() => setLoginMode('nickname')} disabled={isLoading}>
          Nickname Login
        </button>
      </div>
    </>
  );

  return (
    <div className="login-modal-container" role="main-layout">
      <div className="login-modal">{loginMode === 'nickname' ? renderNicknameLogin() : renderAdminLogin()}</div>
    </div>
  );
}
