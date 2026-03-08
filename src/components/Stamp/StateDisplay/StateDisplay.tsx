import { InputLoading } from '@/components/InputLoading/InputLoading';

import './StateDisplay.scss';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <InputLoading />
      <p>{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state">
      <p className="error-message">Error: {message}</p>
      {onRetry && (
        <button className="btn btn-retry" onClick={onRetry} type="button">
          Try Again
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p>{message}</p>
    </div>
  );
}
