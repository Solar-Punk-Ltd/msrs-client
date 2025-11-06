import { getActiveThemeConfig } from '@/utils/theme/themeConfig';

import './Logo.scss';

export enum LogoVariant {
  FULL = 'full',
  ICON = 'icon',
  ON_DARK = 'on-dark',
}

interface LogoProps {
  variant?: LogoVariant;
  className?: string;
  alt?: string;
  height?: number;
}

export function Logo({ variant = LogoVariant.FULL, className = '', alt, height = 50 }: LogoProps) {
  const theme = getActiveThemeConfig();

  let logoPath: string;
  switch (variant) {
    case LogoVariant.ICON:
      logoPath = theme.logoIconPath || theme.logoPath;
      break;
    case LogoVariant.ON_DARK:
      logoPath = theme.logoOnDarkPath || theme.logoPath;
      break;
    case LogoVariant.FULL:
    default:
      logoPath = theme.logoPath;
      break;
  }

  const altText = alt || `${theme.displayName} Logo`;

  return (
    <img
      src={logoPath}
      alt={altText}
      className={`logo logo--${variant} ${className}`.trim()}
      style={{ height: `${height}px` }}
    />
  );
}
