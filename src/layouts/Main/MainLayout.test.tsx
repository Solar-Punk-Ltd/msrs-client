import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MainLayout } from './MainLayout';

describe('MainLayout', () => {
  it('renders children correctly', () => {
    render(
      <MainLayout>
        <div data-testid="child">Child Component</div>
      </MainLayout>,
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders the logo', () => {
    render(
      <MainLayout>
        <div>Test</div>
      </MainLayout>,
    );

    const logo = screen.getByAltText('logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveClass('logo');
  });

  it('applies the correct CSS classes', () => {
    render(
      <MainLayout>
        <div>Test</div>
      </MainLayout>,
    );

    const mainLayout = screen.getByRole('main-layout');
    expect(mainLayout).toHaveClass('main-layout');
  });
});
