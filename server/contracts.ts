import 'dotenv/config';
import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from 'viem/chains';
export const ADDRESSES = {
  BinaryMarketsModule: '0x3ecC694Cef705358864a646142ac17A90E29e388' as Address,
  MarketsCore: '0x2802504314685D89bF6C992CA5a8e7cC78bc0294' as Address,
};
export const moduleAbi = [
  {
    type: 'function',
    name: 'markets',
    stateMutability: 'view',
    inputs: [{ name: 'marketId', type: 'bytes32' }],
    outputs: [
      { type: 'uint256' },
      { type: 'uint8' },
      { type: 'uint8' },
      { type: 'address' },
      { type: 'uint32' },
      { type: 'bytes32' },
      { type: 'address' },
      { type: 'address' },
      { type: 'address' },
      { type: 'address' },
      { type: 'uint256' },
      { type: 'uint256' },
      { type: 'uint64' },
      { type: 'uint64' },
    ],
  },
  {
    type: 'function',
    name: 'mintCompleteSet',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'operatorId', type: 'uint32' },
      { name: 'venueId', type: 'bytes32' },
      { name: 'marketId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'mergeCompleteSet',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'operatorId', type: 'uint32' },
      { name: 'venueId', type: 'bytes32' },
      { name: 'marketId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'redeem',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'operatorId', type: 'uint32' },
      { name: 'venueId', type: 'bytes32' },
      { name: 'marketId', type: 'bytes32' },
      { name: 'outcomeIdx', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;
export const poolAbi = [
  {
    type: 'function',
    name: 'placeOrder',
    stateMutability: 'payable',
    inputs: [
      { name: 'isBid', type: 'bool' },
      { name: 'userData', type: 'uint64' },
      { name: 'price', type: 'uint256' },
      { name: 'quantity', type: 'uint256' },
      { name: 'expireTimestampNs', type: 'uint64' },
      { name: 'orderType', type: 'uint8' },
      { name: 'selfMatchingOption', type: 'uint8' },
      { name: 'builder', type: 'address' },
      { name: 'builderFeeBpsTimes1k', type: 'uint96' },
    ],
    outputs: [
      { name: 'success', type: 'bool' },
      { name: 'id', type: 'uint128' },
    ],
  },
  {
    type: 'function',
    name: 'collateralToken',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'getBinaryPoolParams',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'tickSize', type: 'uint256' },
          { name: 'minQuantity', type: 'uint256' },
          { name: 'lotSize', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'mintSet',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'yesTo', type: 'address' },
      { name: 'noTo', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'burnSet',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'redeem',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'outcomeIdx', type: 'uint8' },
      { name: 'to', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
] as const;
export const erc20Abi = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;
export function publicClient() {
  return createPublicClient({
    chain: somniaTestnet,
    transport: http(process.env.RPC_URL || 'https://dream-rpc.somnia.network'),
  });
}

export function serverWallet() {
  if (!process.env.PRIVATE_KEY) throw Error('PRIVATE_KEY missing');
  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  return {
    account,
    client: createWalletClient({
      account,
      chain: somniaTestnet,
      transport: http(process.env.RPC_URL || 'https://dream-rpc.somnia.network'),
    }),
  };
}
