import { StrictMode, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LightNodeProvider } from '@waku/react';
import { Protocols } from '@waku/sdk';

import { AppContextProvider as AppProvider } from './providers/App/App';
import { Provider as UserProvider } from './providers/User';
import { WalletProvider } from './providers/Wallet';
import { config } from './utils/config';
import { networkConfig } from './utils/waku';
import BaseRouter from './routes';

import '@/styles/globals.scss';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const NODE_OPTIONS = {
  networkConfig,
  bootstrapPeers: config.wakuStaticPeer ? [config.wakuStaticPeer] : undefined,
  defaultBootstrap: !!config.wakuStaticPeer,
  discovery: {
    dns: false,
    peerExchange: true,
    peerCache: false,
  },
};

function AppWithLoading() {
  useEffect(() => {
    // Add class to body to hide initial loading screen
    document.body.classList.add('react-loaded');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <LightNodeProvider options={NODE_OPTIONS} protocols={[Protocols.LightPush, Protocols.Filter]}>
        <WalletProvider>
          <AppProvider>
            <UserProvider>
              <HashRouter>
                <BaseRouter />
              </HashRouter>
            </UserProvider>
          </AppProvider>
        </WalletProvider>
      </LightNodeProvider>
    </QueryClientProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <StrictMode>
    <AppWithLoading />
  </StrictMode>,
);
