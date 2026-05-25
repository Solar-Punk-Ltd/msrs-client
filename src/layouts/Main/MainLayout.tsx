import { Link } from 'react-router-dom';

import { Footer } from '@/components/Footer';
import { LoginButton } from '@/components/LoginButton/LoginButton';
import { LoginModal } from '@/components/LoginModal/LoginModal';
import { Logo, LogoVariant } from '@/components/Logo';
import { NetworkStatus } from '@/components/NetworkStatus/NetworkStatus';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTheme } from '@/providers/Theme';
import { useUserContext } from '@/providers/User';
import { ROUTES } from '@/routes';
import { AVAILABLE_THEMES } from '@/utils/theme/themeConfig';

import './MainLayout.scss';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isOnline } = useNetworkStatus(); // TODO - reanable
  const { isLoginModalOpen } = useUserContext();
  const { theme } = useTheme();

  const { backgroundVideoPath, showFooter } = AVAILABLE_THEMES[theme];

  return (
    <div className={`main-layout${showFooter ? ' main-layout--has-footer' : ''}`} role="main-layout">
      {backgroundVideoPath && (
        <video className="main-layout__background-video" src={backgroundVideoPath} autoPlay muted playsInline />
      )}
      <NetworkStatus isOnline={true} />
      <header>
        <Link to={ROUTES.STREAM_BROWSER} className="logo-link" aria-label="Go to stream browser">
          <Logo className="logo logo--desktop" />
          <Logo variant={LogoVariant.ICON} className="logo logo--mobile" />
        </Link>
        <LoginButton />
      </header>
      {isLoginModalOpen && <LoginModal />}
      <div className="content">
        {children}
        {showFooter && <Footer />}
      </div>
    </div>
  );
}
