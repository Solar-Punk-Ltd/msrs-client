import './ErrorMessage.scss';

export function ErrorMessage({ error }: { error: string | null }) {
  if (!error) return null;

  return <div className="error-message">{error}</div>;
}
