import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import './PortalTooltip.scss';

interface PortalTooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  offset?: number;
  delay?: number;
  disabled?: boolean;
  maxWidth?: number;
  interactive?: boolean;
}

interface TooltipPosition {
  top: number;
  left: number;
}

export function PortalTooltip({
  content,
  children,
  className = '',
  position = 'auto',
  offset = 8,
  delay = 200,
  disabled = false,
  maxWidth = 300,
  interactive = false,
}: PortalTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({ top: 0, left: 0 });
  const [actualPosition, setActualPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const touchTimeoutRef = useRef<NodeJS.Timeout>();

  const calculatePosition = useCallback(() => {
    if (!containerRef.current || !tooltipRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;

    tooltipEl.style.visibility = 'hidden';
    tooltipEl.style.display = 'block';
    const tooltipRect = tooltipEl.getBoundingClientRect();
    tooltipEl.style.visibility = '';
    tooltipEl.style.display = '';

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let calculatedPosition = position === 'auto' ? 'bottom' : position;
    let top = 0;
    let left = 0;

    if (position === 'auto') {
      const spaceAbove = containerRect.top;
      const spaceBelow = viewportHeight - containerRect.bottom;
      const spaceLeft = containerRect.left;
      const spaceRight = viewportWidth - containerRect.right;

      if (spaceBelow >= tooltipRect.height + offset) {
        calculatedPosition = 'bottom';
      } else if (spaceAbove >= tooltipRect.height + offset) {
        calculatedPosition = 'top';
      } else if (spaceRight >= tooltipRect.width + offset) {
        calculatedPosition = 'right';
      } else if (spaceLeft >= tooltipRect.width + offset) {
        calculatedPosition = 'left';
      } else {
        calculatedPosition = 'bottom'; // Default fallback
      }
    }

    // Calculate position based on placement
    switch (calculatedPosition) {
      case 'top':
        top = containerRect.top - tooltipRect.height - offset;
        left = containerRect.left + containerRect.width / 2;
        break;
      case 'bottom':
        top = containerRect.bottom + offset;
        left = containerRect.left + containerRect.width / 2;
        break;
      case 'left':
        top = containerRect.top + containerRect.height / 2;
        left = containerRect.left - tooltipRect.width - offset;
        break;
      case 'right':
        top = containerRect.top + containerRect.height / 2;
        left = containerRect.right + offset;
        break;
    }

    // Adjust for viewport boundaries
    const padding = 8; // Minimum distance from viewport edge

    // Horizontal adjustments
    if (calculatedPosition === 'top' || calculatedPosition === 'bottom') {
      // Center-aligned tooltips
      const halfWidth = tooltipRect.width / 2;
      if (left - halfWidth < padding) {
        left = halfWidth + padding;
      } else if (left + halfWidth > viewportWidth - padding) {
        left = viewportWidth - halfWidth - padding;
      }
    } else {
      // Left/right aligned tooltips
      if (left < padding) {
        left = padding;
      } else if (left + tooltipRect.width > viewportWidth - padding) {
        left = viewportWidth - tooltipRect.width - padding;
      }
    }

    // Vertical adjustments
    if (calculatedPosition === 'left' || calculatedPosition === 'right') {
      // Middle-aligned tooltips
      const halfHeight = tooltipRect.height / 2;
      if (top - halfHeight < padding) {
        top = halfHeight + padding;
      } else if (top + halfHeight > viewportHeight - padding) {
        top = viewportHeight - halfHeight - padding;
      }
    } else {
      // Top/bottom aligned tooltips
      if (top < padding) {
        top = padding;
      } else if (top + tooltipRect.height > viewportHeight - padding) {
        top = viewportHeight - tooltipRect.height - padding;
      }
    }

    setTooltipPosition({ top, left });
    setActualPosition(calculatedPosition);
  }, [position, offset]);

  const showTooltipHandler = useCallback(() => {
    if (disabled) return;
    setShowTooltip(true);
    // Use RAF to ensure tooltip is rendered before calculating position
    requestAnimationFrame(() => {
      calculatePosition();
    });
  }, [disabled, calculatePosition]);

  const hideTooltipHandler = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(showTooltipHandler, delay);
  }, [disabled, delay, showTooltipHandler]);

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!interactive) {
      hideTooltipHandler();
    } else {
      timeoutRef.current = setTimeout(hideTooltipHandler, 100);
    }
  }, [hideTooltipHandler, interactive]);

  const handleTooltipMouseEnter = useCallback(() => {
    if (interactive && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [interactive]);

  const handleTooltipMouseLeave = useCallback(() => {
    if (interactive) {
      hideTooltipHandler();
    }
  }, [hideTooltipHandler, interactive]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();

      if (!showTooltip) {
        showTooltipHandler();
        // Auto-hide after 3 seconds on touch devices
        touchTimeoutRef.current = setTimeout(() => {
          hideTooltipHandler();
        }, 3000);
      } else {
        hideTooltipHandler();
        if (touchTimeoutRef.current) {
          clearTimeout(touchTimeoutRef.current);
        }
      }
    },
    [disabled, showTooltip, showTooltipHandler, hideTooltipHandler],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showTooltip) return;

    const handleResize = () => {
      calculatePosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [showTooltip, calculatePosition]);

  if (!content) return <>{children}</>;

  return (
    <>
      <div
        ref={containerRef}
        className={`portal-tooltip-container ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
      >
        {children}
      </div>

      {showTooltip &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`portal-tooltip portal-tooltip--${actualPosition}`}
            style={{
              position: 'fixed',
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              maxWidth: `min(${maxWidth}px, calc(100vw - 16px))`,
              zIndex: 99999,
            }}
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
          >
            <div className="portal-tooltip-content">{content}</div>
          </div>,
          document.body,
        )}
    </>
  );
}
