import SpLogo from '@/assets/images/sp-logo.png';
import { LoginButton } from '@/components/LoginButton/LoginButton';
import { LoginModal } from '@/components/LoginModal/LoginModal';
import { NetworkStatus } from '@/components/NetworkStatus/NetworkStatus';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useUserContext } from '@/providers/User';

import './MainLayout.scss';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isOnline } = useNetworkStatus();
  const { isLoginModalOpen } = useUserContext();

  return (
    <div className="main-layout" role="main-layout">
      <NetworkStatus isOnline={isOnline} />
      <header>
        <img src={SpLogo} alt="logo" className="logo" />
        <LoginButton />
      </header>
      {isLoginModalOpen && <LoginModal />}
      <div className="content">{children}</div>
    </div>
  );
}
