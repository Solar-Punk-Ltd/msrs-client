import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

import './ProfilePicture.scss';

interface ProfilePictureProps {
  name: string;
  color: string;
  ownMessage?: boolean;
}

export function ProfilePicture({ name, color, ownMessage = false }: ProfilePictureProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const profileRef = useRef<HTMLDivElement>(null);

  const initial = name.charAt(0).toUpperCase();

  const handleMouseEnter = () => {
    if (profileRef.current) {
      const rect = profileRef.current.getBoundingClientRect();
      const tooltipWidth = name.length * 8 + 16; // Approximate tooltip width

      let left = rect.left + rect.width / 2;
      let top = rect.bottom + 4; // Position below the profile picture

      // For own messages, center the tooltip under the profile picture
      if (ownMessage) {
        left = rect.left + rect.width / 2;
      }

      // Ensure tooltip doesn't go off screen horizontally
      if (left + tooltipWidth / 2 > window.innerWidth - 8) {
        left = window.innerWidth - tooltipWidth / 2 - 8;
      }
      if (left - tooltipWidth / 2 < 8) {
        left = tooltipWidth / 2 + 8;
      }

      // If tooltip would go below viewport, show it above instead
      if (top + 32 > window.innerHeight) {
        top = rect.top - 32;
      }

      setTooltipPosition({ top, left });
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <>
      <div
        ref={profileRef}
        className={clsx('profile-picture', { 'own-message': ownMessage })}
        role="profile-picture"
        style={{ backgroundColor: color }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {initial}
      </div>

      {showTooltip &&
        createPortal(
          <div
            className="profile-picture-portal-tooltip"
            style={{
              position: 'fixed',
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              transform: 'translateX(-50%)',
              zIndex: 99999,
              whiteSpace: 'nowrap',
              padding: '4px 8px',
              borderRadius: '4px',
              background: 'rgba(0, 0, 0, 0.75)',
              color: '#fff',
              fontSize: '12px',
              pointerEvents: 'none',
              fontFamily: 'Open Sans, sans-serif',
            }}
          >
            {name}
          </div>,
          document.body,
        )}
    </>
  );
}
