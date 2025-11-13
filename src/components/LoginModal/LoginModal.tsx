import { useState } from 'react';

import { Button, ButtonVariant } from '@/components/Button/Button';
import { useUserContext } from '@/providers/User';

import './LoginModal.scss';

type LoginMode = 'username' | 'admin';

export function LoginModal() {
  const { nickname, loginAsAdmin, loginAsUser, setIsLoginModalOpen } = useUserContext();
  const [loginMode, setLoginMode] = useState<LoginMode>('username');
  const [localName, setLocalName] = useState(nickname || '');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUsernameLogin = async () => {
    const trimmedName = localName.trim();
    if (trimmedName && trimmedName.length > 0 && trimmedName.length <= 20) {
      setIsLoading(true);
      setError(null);

      try {
        await loginAsUser(trimmedName);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed');
      } finally {
        setIsLoginModalOpen(false);
        setIsLoading(false);
      }
    } else {
      setError('Username must be between 1 and 20 characters');
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

  const renderUsernameLogin = () => (
    <>
      <div className="login-modal-header">Chat</div>
      <div className="login-modal-content">Please add your username for the chat!</div>

      {error && <div className="login-modal-error">{error}</div>}

      <div className="login-modal-input-container">
        <div className="login-modal-input-nickname">Username: </div>
        <input
          value={localName || ''}
          className="login-modal-input"
          onChange={(e) => setLocalName(e.target.value)}
          disabled={isLoading}
          maxLength={20}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleUsernameLogin();
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
          onClick={handleUsernameLogin}
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
        <button className="login-modal-switch-link" onClick={() => setLoginMode('username')} disabled={isLoading}>
          User Login
        </button>
      </div>
    </>
  );

  return (
    <div className="login-modal-container" role="main-layout">
      <div className="login-modal">{loginMode === 'username' ? renderUsernameLogin() : renderAdminLogin()}</div>
    </div>
  );
}
