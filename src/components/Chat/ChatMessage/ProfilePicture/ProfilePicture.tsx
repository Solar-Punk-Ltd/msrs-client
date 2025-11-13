import clsx from 'clsx';

import { PortalTooltip } from '@/components/PortalTooltip/PortalTooltip';
import { createUniqueUsername } from '@/utils/ui/format';

import './ProfilePicture.scss';

interface ProfilePictureProps {
  name: string;
  address: string;
  color: string;
  ownMessage?: boolean;
}

export function ProfilePicture({ name, address, color, ownMessage = false }: ProfilePictureProps) {
  const trimmedName = name.trim();
  const initial = trimmedName.charAt(0).toUpperCase();
  const uniqueUsername = createUniqueUsername(trimmedName, address);

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
