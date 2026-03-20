import { createConfig, http } from 'wagmi';
import { gnosis } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';

import { GNOSIS_RPC_URL } from '@/utils/network/contracts';

export const wagmiConfig = createConfig({
  chains: [gnosis],
  connectors: [metaMask()],
  transports: {
    [gnosis.id]: http(GNOSIS_RPC_URL),
  },
});
