import './TabBar.scss';

export const STAMP_TAB = {
  BULK_STAMP: 'bulk-stamp',
  SOLO: 'solo',
} as const;

export type StampViewTab = (typeof STAMP_TAB)[keyof typeof STAMP_TAB];

interface TabBarProps {
  activeTab: StampViewTab;
  onTabChange: (tab: StampViewTab) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="stamp-tab-bar">
      <button
        className={`stamp-tab ${activeTab === STAMP_TAB.BULK_STAMP ? 'stamp-tab--active' : ''}`}
        onClick={() => onTabChange(STAMP_TAB.BULK_STAMP)}
        type="button"
      >
        Bulk
      </button>
      <button
        className={`stamp-tab ${activeTab === STAMP_TAB.SOLO ? 'stamp-tab--active' : ''}`}
        onClick={() => onTabChange(STAMP_TAB.SOLO)}
        type="button"
      >
        Solo
      </button>
    </div>
  );
}
