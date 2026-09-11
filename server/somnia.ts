import 'dotenv/config';
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from '@somnia-chain/markets-sdk';
import { somniaTestnet } from 'viem/chains';
export const INDEXER_URL = process.env.INDEXER_URL || 'https://prd.smk.somnia.host/v1/graphql';
export const WS_RPC_URL = process.env.WS_RPC_URL || 'wss://dream-rpc.somnia.network/ws';
export function createExchange() {
  const privateKey = process.env.PRIVATE_KEY?.trim();
  return new SomniaMarkets({
    indexerUrl: INDEXER_URL,
    chain: somniaTestnet,
    wsRpcUrl: WS_RPC_URL,
    addresses: SOMNIA_TESTNET_ADDRESSES,
    privateKey: privateKey && privateKey.startsWith('0x') ? (privateKey as `0x${string}`) : undefined,
  });
}
