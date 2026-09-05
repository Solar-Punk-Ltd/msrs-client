import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button/Button';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useTheme } from '@/providers/Theme';
import { useUserContext } from '@/providers/User';
import { ROUTES } from '@/routes';
import { AVAILABLE_THEMES, THEME_NAMES, ThemeName } from '@/utils/theme/themeConfig';

import { ConfirmationModal } from '../ConfirmationModal/ConfirmationModal';

import './LoginButton.scss';

export const LoginButton = () => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { isUserLoggedIn, setIsLoginModalOpen, nickname, logout, isAdmin, isSolarpunkAdmin } = useUserContext();
  const { theme, setTheme } = useTheme();

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

  const handleUploader = () => {
    setIsDropdownOpen(false);
    navigate(ROUTES.STREAM_UPLOADER);
  };

  const handleMyStamps = () => {
    navigate(ROUTES.STAMP_DASHBOARD);
    setIsDropdownOpen(false);
  };

  const handleThemeToggle = () => {
    const order: ThemeName[] = [THEME_NAMES.SOLARPUNK, THEME_NAMES.CRYPTOMONDAYS, THEME_NAMES.SWARM];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  };

  if (isUserLoggedIn) {
    return (
      <div className="login-button-container" ref={dropdownRef}>
        <ConfirmationModal
          isOpen={logoutModalOpen}
          title="Are you sure?"
          message="If you log out, your display name won't be saved. You'll need to choose one again next time."
          confirmText="Log out"
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
              Browse streams
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
            {isAdmin && (
              <button className="login-dropdown-item" onClick={handleUploader}>
                Stream uploader
              </button>
            )}
            <div className="login-dropdown-divider" />
            {isSolarpunkAdmin && (
              <button className="login-dropdown-item" onClick={handleThemeToggle}>
                Theme: {AVAILABLE_THEMES[theme].displayName}
              </button>
            )}
            <button className="login-dropdown-item" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <Button className="login-button" onClick={handleButtonClick}>
      Log in
    </Button>
  );
};
