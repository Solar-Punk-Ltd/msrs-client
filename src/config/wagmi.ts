import { createConfig, http } from 'wagmi';
import { gnosis } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';

const GNOSIS_RPC_URL = 'https://rpc.gnosischain.com';

export const wagmiConfig = createConfig({
  chains: [gnosis],
  connectors: [metaMask()],
  transports: {
    [gnosis.id]: http(GNOSIS_RPC_URL),
  },
});
