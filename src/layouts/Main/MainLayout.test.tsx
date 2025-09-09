import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppContextProvider } from '@/providers/App';
import { Provider as UserProvider } from '@/providers/User';

import { MainLayout } from './MainLayout';

vi.mock('@/utils/login', () => ({
  autoLogin: vi.fn(),
}));

describe('MainLayout', () => {
  const renderMainLayout = (children: React.ReactNode) =>
    render(
      <MemoryRouter>
        <AppContextProvider>
          <UserProvider>
            <MainLayout>{children}</MainLayout>
          </UserProvider>
        </AppContextProvider>
      </MemoryRouter>,
    );
  it('renders children correctly', () => {
    renderMainLayout(<div data-testid="child">Child Component</div>);

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders the logo', () => {
    renderMainLayout(<div>Test</div>);

    const logo = screen.getByAltText('logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveClass('logo');
  });

  it('applies the correct CSS classes', () => {
    renderMainLayout(<div>Test</div>);

    const mainLayout = screen.getByRole('main-layout');
    expect(mainLayout).toHaveClass('main-layout');
  });
});
