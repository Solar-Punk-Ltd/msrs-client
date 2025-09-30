import { useState } from 'react';

import './StreamInfo.scss';

const ChevronDownIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M5 7.5L10 12.5L15 7.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M15 12.5L10 7.5L5 12.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="8" cy="4.5" r="0.5" fill="currentColor" />
  </svg>
);

interface StreamInfoProps {
  title: string;
  description: string;
  scheduledStartTime?: string;
  isScheduled: boolean;
}

export function StreamInfo({ title, description, scheduledStartTime, isScheduled }: StreamInfoProps) {
  const [isExpanded, setIsExpanded] = useState(isScheduled);

  return (
    <div className={`stream-info-container ${isExpanded ? 'expanded' : 'collapsed'} ${isScheduled ? 'scheduled' : ''}`}>
      {!isScheduled && (
        <button className="stream-info-toggle" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded}>
          <div className="toggle-header">
            <div className="toggle-title">
              <span className="stream-title">{title}</span>
            </div>
            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </div>
        </button>
      )}

      {(isExpanded || isScheduled) && (
        <div className="stream-info-content">
          {isScheduled && <h1 className="stream-info-title">{title}</h1>}

          <div className="stream-info-details">
            {description && (
              <div className="info-section">
                <h3>Description</h3>
                <p>{description}</p>
              </div>
            )}

            {scheduledStartTime && isScheduled && (
              <div className="info-section">
                <h3>Scheduled Start</h3>
                <p>{new Date(scheduledStartTime).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
