import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button/Button';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useUserContext } from '@/providers/User';
import { ROUTES } from '@/routes';

import './LoginButton.scss';

export const LoginButton = () => {
  const { isUserLoggedIn, setIsLoginModalOpen, nickname, logout, isAdmin } = useUserContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useClickOutside([dropdownRef], () => setIsDropdownOpen(false), isDropdownOpen);

  const handleButtonClick = () => {
    if (isUserLoggedIn) {
      setIsDropdownOpen(!isDropdownOpen);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
    navigate(ROUTES.STREAM_BROWSER);
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
              Disconnect
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
