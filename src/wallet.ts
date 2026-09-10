import { createWalletClient, custom, type Address } from 'viem';
import { somniaTestnet } from 'viem/chains';
export type WalletState = { address: Address | null; connected: boolean };
export async function connectWallet(): Promise<WalletState> {
  const eth = (window as any).ethereum;
  if (!eth) throw Error('No EVM wallet found. Install MetaMask or another injected wallet.');
  const accounts = await eth.request({ method: 'eth_requestAccounts' });
  if (!accounts?.[0]) throw Error('Wallet did not return an account.');
  try {
    await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xc488' }] });
  } catch {
    try {
      await eth.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0xc488',
            chainName: 'Somnia Shannon Testnet',
            nativeCurrency: { name: 'STT', symbol: 'STT', decimals: 18 },
            rpcUrls: ['https://dream-rpc.somnia.network'],
            blockExplorerUrls: ['https://shannon-explorer.somnia.network'],
          },
        ],
      });
    } catch {}
  }
  return { address: accounts[0] as Address, connected: true };
}
export function getWalletClient() {
  const eth = (window as any).ethereum;
  if (!eth) throw Error('No injected wallet.');
  return createWalletClient({ chain: somniaTestnet, transport: custom(eth) });
}
