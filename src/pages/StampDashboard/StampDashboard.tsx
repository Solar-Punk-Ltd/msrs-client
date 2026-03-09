import { useState } from 'react';

import { STAMP_TAB, type StampViewTab, TabBar } from '@/components/Stamp/Controls/TabBar/TabBar';
import { BulkStampManager } from '@/components/Stamp/Manager/BulkStampManager';
import { StampManager } from '@/components/Stamp/Manager/StampManager';
import { StampManagerHeader } from '@/components/Stamp/Manager/StampManagerHeader';
import { StampInfoPanel } from '@/components/Stamp/Panels/StampInfoPanel/StampInfoPanel';
import { useStamps } from '@/hooks/useStamps';
import { useUserContext } from '@/providers/User';
import { useWallet } from '@/providers/Wallet';

import './StampDashboard.scss';

export function StampDashboard() {
  const { provider, signer } = useWallet();
  const { session, isSolarpunkAdmin } = useUserContext();
  const stamps = useStamps(session?.serverKeys.nginx, provider);

  const [activeTab, setActiveTab] = useState<StampViewTab>(isSolarpunkAdmin ? STAMP_TAB.BULK_STAMP : STAMP_TAB.SOLO);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="stamp-dashboard">
      <div className="stamp-dashboard-inner">
        <StampManagerHeader
          showInfo={showInfo}
          onToggleInfo={() => setShowInfo(!showInfo)}
          showInfoButton={activeTab === STAMP_TAB.SOLO}
        />

        {showInfo && activeTab === STAMP_TAB.SOLO && <StampInfoPanel />}

        {isSolarpunkAdmin && <TabBar activeTab={activeTab} onTabChange={setActiveTab} />}

        <div className="stamp-dashboard-content">
          {activeTab === STAMP_TAB.BULK_STAMP ? (
            <BulkStampManager stamps={stamps} signer={signer} />
          ) : (
            <StampManager stamps={stamps} signer={signer} />
          )}
        </div>
      </div>
    </div>
  );
}
