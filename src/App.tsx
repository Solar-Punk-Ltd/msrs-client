import { StrictMode, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useThemeAssets } from './hooks/useThemeAssets';
import { AppContextProvider as AppProvider } from './providers/App/App';
import { ThemeProvider, useTheme } from './providers/Theme';
import { Provider as UserProvider } from './providers/User';
import { WakuProvider } from './providers/Waku';
import { WalletProvider } from './providers/Wallet';
import BaseRouter from './routes';

import '@/styles/globals.scss';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

function AppContent() {
  const { theme } = useTheme();

  useThemeAssets(theme);

  useEffect(() => {
    // Hide initial loading screen as soon as React is mounted
    document.body.classList.add('react-loaded');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <WalletProvider>
          <UserProvider>
            <WakuProvider>
              <AppProvider>
                <BaseRouter />
              </AppProvider>
            </WakuProvider>
          </UserProvider>
        </WalletProvider>
      </HashRouter>
    </QueryClientProvider>
  );
}

function AppWithLoading() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <StrictMode>
    <AppWithLoading />
  </StrictMode>,
);
