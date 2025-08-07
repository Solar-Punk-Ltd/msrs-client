import { LoginButton } from '@/components/LoginButton/LoginButton';
import { NameSetterModal } from '@/components/NameSetterModal/NameSetterModal';
import { NetworkStatus } from '@/components/NetworkStatus/NetworkStatus';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useUserContext } from '@/providers/User';

import './MainLayout.scss';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isOnline } = useNetworkStatus();
  const { isNicknameModalOpen, setIsNicknameModalOpen } = useUserContext();

  return (
    <div className="main-layout" role="main-layout">
      <NetworkStatus isOnline={isOnline} />
      <header>
        <img
          src="https://rpc.beebridge.buzz/read/bzz/78d8aa2af97a6060a7807b7a0830ee2b24c1569e71c8d1b7f7edd875172512cc/assets/sp-logo.png"
          alt="logo"
          className="logo"
        />
        <LoginButton />
      </header>
      {isNicknameModalOpen && <NameSetterModal onClose={() => setIsNicknameModalOpen(false)} />}
      <div className="content">{children}</div>
    </div>
  );
}
