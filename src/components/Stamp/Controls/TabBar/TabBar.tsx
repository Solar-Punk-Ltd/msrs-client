import './TabBar.scss';

export const STAMP_TAB = {
  BATCH: 'batch',
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
        className={`stamp-tab ${activeTab === STAMP_TAB.BATCH ? 'stamp-tab--active' : ''}`}
        onClick={() => onTabChange(STAMP_TAB.BATCH)}
        type="button"
      >
        Batch
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
