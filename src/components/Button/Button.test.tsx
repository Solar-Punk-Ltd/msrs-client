import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button, ButtonVariant } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button variant={ButtonVariant.PRIMARY}>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const mock = vi.fn();
    render(
      <Button onClick={mock} variant={ButtonVariant.PRIMARY}>
        Click me
      </Button>,
    );
    fireEvent.click(screen.getByText('Click me'));
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('applies primary class', () => {
    render(<Button variant={ButtonVariant.PRIMARY}>Primary</Button>);
    expect(screen.getByText('Primary')).toHaveClass('primary');
  });

  it('applies secondary class', () => {
    render(<Button variant={ButtonVariant.SECONDARY}>Secondary</Button>);
    expect(screen.getByText('Secondary')).toHaveClass('secondary');
  });

  it('disabled button does not call onClick', () => {
    const mock = vi.fn();
    render(
      <Button variant={ButtonVariant.PRIMARY} onClick={mock} disabled>
        Disabled
      </Button>,
    );
    fireEvent.click(screen.getByText('Disabled'));
    expect(mock).toHaveBeenCalledTimes(0);
  });
});
