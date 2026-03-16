import { FinancialStatus } from '@/utils/network/stampInfo';
import { formatDays, formatStampExpirationDate } from '@/utils/ui/format';

interface TTLDisplayProps {
  financialStatus: FinancialStatus;
  classPrefix: string;
}

export function TTLDisplay({ financialStatus, classPrefix }: TTLDisplayProps) {
  return (
    <div className={`${classPrefix}-row`}>
      <span className={`${classPrefix}-label`}>TTL:</span>
      <span className={`${classPrefix}-value`}>
        {financialStatus.isActive ? formatDays(financialStatus.remainingDays) : 'Expired'}
        {financialStatus.expirationDate && (
          <span className={`${classPrefix}-subtitle`}>
            ({formatStampExpirationDate(financialStatus.expirationDate)})
          </span>
        )}
      </span>
    </div>
  );
}
