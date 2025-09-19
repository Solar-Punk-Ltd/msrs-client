import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AppContextProvider as AppProvider } from './providers/App';
import { Provider as UserProvider } from './providers/User';
import BaseRouter from './routes';

import '@/styles/globals.scss';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <UserProvider>
          <HashRouter>
            <BaseRouter />
          </HashRouter>
        </UserProvider>
      </AppProvider>
    </QueryClientProvider>
  </StrictMode>,
);
