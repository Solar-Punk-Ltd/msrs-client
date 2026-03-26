import { createConfig, http } from 'wagmi';
import { gnosis } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';

import { GNOSIS_RPC_URL } from '@/utils/network/contracts';

export const metaMaskConnector = metaMask();

export const wagmiConfig = createConfig({
  chains: [gnosis],
  connectors: [metaMaskConnector],
  transports: {
    [gnosis.id]: http(GNOSIS_RPC_URL),
  },
});
