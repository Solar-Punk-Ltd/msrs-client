import clsx from 'clsx';

import { PortalTooltip } from '@/components/PortalTooltip/PortalTooltip';
import { createUniqueUsername } from '@/utils/format';

import './ProfilePicture.scss';

interface ProfilePictureProps {
  name: string;
  address: string;
  color: string;
  ownMessage?: boolean;
}

export function ProfilePicture({ name, address, color, ownMessage = false }: ProfilePictureProps) {
  const initial = name.charAt(0).toUpperCase();
  const uniqueUsername = createUniqueUsername(name, address);

  return (
    <PortalTooltip content={uniqueUsername} position="auto" delay={200} maxWidth={200}>
      <div
        className={clsx('profile-picture', { 'own-message': ownMessage })}
        role="img"
        aria-label={uniqueUsername}
        style={{ backgroundColor: color }}
      >
        {initial}
      </div>
    </PortalTooltip>
  );
}
