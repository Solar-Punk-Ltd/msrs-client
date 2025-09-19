import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SimpleModal } from './SimpleModal';

describe('SimpleModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Test Modal',
    onClose: vi.fn(),
    closeText: 'Close',
  };

  it('renders when open', () => {
    render(
      <SimpleModal {...defaultProps}>
        <div>Test content</div>
      </SimpleModal>,
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <SimpleModal {...defaultProps} isOpen={false}>
        <div>Test content</div>
      </SimpleModal>,
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Test content')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <SimpleModal {...defaultProps} onClose={onClose}>
        <div>Test content</div>
      </SimpleModal>,
    );

    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders with custom close text', () => {
    render(
      <SimpleModal {...defaultProps} closeText="Done">
        <div>Test content</div>
      </SimpleModal>,
    );

    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.queryByText('Close')).not.toBeInTheDocument();
  });

  it('renders complex content correctly', () => {
    render(
      <SimpleModal {...defaultProps}>
        <div className="simple-modal-subheader">Subheader text</div>
        <div className="simple-modal-token">Token value</div>
      </SimpleModal>,
    );

    expect(screen.getByText('Subheader text')).toBeInTheDocument();
    expect(screen.getByText('Token value')).toBeInTheDocument();
  });
});
