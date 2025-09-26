import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button/Button';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useUserContext } from '@/providers/User';
import { ROUTES } from '@/routes';

import { ConfirmationModal } from '../ConfirmationModal/ConfirmationModal';

import './LoginButton.scss';

export const LoginButton = () => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { isUserLoggedIn, setIsLoginModalOpen, nickname, logout, isAdmin } = useUserContext();

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useClickOutside([dropdownRef], () => setIsDropdownOpen(false), isDropdownOpen);

  const handleButtonClick = () => {
    if (isUserLoggedIn) {
      setIsDropdownOpen(!isDropdownOpen);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleLogout = () => {
    if (isAdmin) {
      logout();
      setIsDropdownOpen(false);
      navigate(ROUTES.STREAM_BROWSER);
    } else {
      setLogoutModalOpen(true);
      setIsDropdownOpen(false);
    }
  };

  const handleLogoutModalConfirm = () => {
    logout();
    setIsDropdownOpen(false);
    setLogoutModalOpen(false);
    navigate(ROUTES.STREAM_BROWSER);
  };

  const handleLogoutModalCancel = () => {
    setLogoutModalOpen(false);
  };

  const handleMyStreams = () => {
    navigate(ROUTES.STREAM_MANAGER);
    setIsDropdownOpen(false);
  };

  const handleBrowser = () => {
    navigate(ROUTES.STREAM_BROWSER);
    setIsDropdownOpen(false);
  };

  const handleMyStamps = () => {
    navigate(ROUTES.STAMP_DASHBOARD);
    setIsDropdownOpen(false);
  };

  if (isUserLoggedIn) {
    return (
      <div className="login-button-container" ref={dropdownRef}>
        <ConfirmationModal
          isOpen={logoutModalOpen}
          title="Logout Confirmation"
          message="If you log out, you lose your persisted session which cannot be recovered. A new session will be created when you log in again which comes with a new Identity. Are you sure you want to proceed?"
          confirmText="Ok"
          cancelText="Cancel"
          onConfirm={handleLogoutModalConfirm}
          onCancel={handleLogoutModalCancel}
        />

        <Button className="login-button" onClick={handleButtonClick}>
          {nickname}
        </Button>

        {isDropdownOpen && (
          <div className="login-dropdown">
            <button className="login-dropdown-item" onClick={handleBrowser}>
              Stream Browser
            </button>
            {isAdmin && (
              <button className="login-dropdown-item" onClick={handleMyStreams}>
                My Streams
              </button>
            )}
            {isAdmin && (
              <button className="login-dropdown-item" onClick={handleMyStamps}>
                My Stamps
              </button>
            )}
            <button className="login-dropdown-item" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button className="login-button" onClick={handleButtonClick}>
      Login
    </Button>
  );
};
