import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppContextProvider } from '@/providers/App/App';
import { ThemeProvider } from '@/providers/Theme';
import { Provider as UserProvider } from '@/providers/User';
import { WakuProvider } from '@/providers/Waku';

import { MainLayout } from './MainLayout';

vi.mock('@/utils/auth/login', () => ({
  autoLogin: vi.fn(),
}));

vi.mock('@/providers/Waku', () => ({
  WakuProvider: ({ children }: any) => children,
  useWakuContext: () => ({
    node: null,
  }),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      getQueryData: vi.fn(),
      setQueryData: vi.fn(),
      invalidateQueries: vi.fn(),
    }),
  };
});

describe('MainLayout', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderMainLayout = (children: React.ReactNode) =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <WakuProvider>
            <AppContextProvider>
              <UserProvider>
                <ThemeProvider>
                  <MainLayout>{children}</MainLayout>
                </ThemeProvider>
              </UserProvider>
            </AppContextProvider>
          </WakuProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  it('renders children correctly', () => {
    renderMainLayout(<div data-testid="child">Child Component</div>);

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('renders the logo', () => {
    renderMainLayout(<div>Test</div>);

    const logo = screen.getByAltText('SolarPunk Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveClass('logo');
  });

  it('applies the correct CSS classes', () => {
    renderMainLayout(<div>Test</div>);

    const mainLayout = screen.getByRole('main-layout');
    expect(mainLayout).toHaveClass('main-layout');
  });
});
