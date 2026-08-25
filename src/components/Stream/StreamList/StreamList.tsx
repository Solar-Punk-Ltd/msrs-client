import { useTheme } from '@/providers/Theme';
import { AVAILABLE_THEMES } from '@/utils/theme/themeConfig';

import { BaseStreamList } from '../BaseStreamList/BaseStreamList';

import './StreamList.scss';

export function StreamList() {
  const { theme } = useTheme();
  const groupBySchedule = AVAILABLE_THEMES[theme].groupStreamsBySchedule ?? false;

  return <BaseStreamList className="stream-list" enableSearch groupBySchedule={groupBySchedule} />;
}
