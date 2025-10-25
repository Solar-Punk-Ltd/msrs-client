import { StrictMode, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AppContextProvider as AppProvider } from './providers/App/App';
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

function AppWithLoading() {
  useEffect(() => {
    // Add class to body to hide initial loading screen
    document.body.classList.add('react-loaded');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <WakuProvider>
          <AppProvider>
            <UserProvider>
              <HashRouter>
                <BaseRouter />
              </HashRouter>
            </UserProvider>
          </AppProvider>
        </WakuProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <StrictMode>
    <AppWithLoading />
  </StrictMode>,
);
