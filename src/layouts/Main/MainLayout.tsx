import { LoginButton } from '@/components/LoginButton/LoginButton';
import { LoginModal } from '@/components/LoginModal/LoginModal';
import { Logo } from '@/components/Logo';
import { NetworkStatus } from '@/components/NetworkStatus/NetworkStatus';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useUserContext } from '@/providers/User';

import './MainLayout.scss';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isOnline } = useNetworkStatus(); // TODO - reanable
  const { isLoginModalOpen } = useUserContext();

  return (
    <div className="main-layout" role="main-layout">
      <NetworkStatus isOnline={true} />
      <header>
        <Logo height={50} className="logo" />
        <LoginButton />
      </header>
      {isLoginModalOpen && <LoginModal />}
      <div className="content">{children}</div>
    </div>
  );
}
