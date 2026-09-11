import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createExchange } from './somnia.js';
import {
  publicClient,
  serverWallet,
  ADDRESSES,
  moduleAbi,
  poolAbi,
  erc20Abi,
} from './contracts.js';
import { surface, signals, scenarios, validateStrategy, type Strategy } from '../src/engine.js';
import { dbGet, dbUpdate, recordSnapshot, recordTrade, saveStrategy } from './db.js';
const app = express();
app.use(cors());
app.use(express.json());
const port = Number(process.env.PORT || 8787);
const hex = (x: string) => x as `0x${string}`;
app.get('/api/health', (_q, r) =>
  r.json({
    ok: true,
    chainId: 50312,
    network: 'shannon-testnet',
    liveTrading: process.env.ENABLE_LIVE_TRADING === 'true',
    privateKeyConfigured: Boolean(process.env.PRIVATE_KEY),
  }),
);
async function discover() {
  const ex = createExchange();
  const rows = await ex.client.listLiveBinaryMarkets({});
  return Promise.all(
    rows.slice(0, 100).map(async (m: any) => {
      let book: any;
      try {
        if (m.poolAddress) book = await ex.client.getBinaryOrderBook(m.poolAddress, { depth: 10 });
      } catch {}
      let on: any;
      try {
        on = await ex.client.getMarketOnchain(hex(m.marketId));
      } catch {}
      return {
        marketId: String(m.marketId),
        asset: m.asset || 'UNKNOWN',
        intervalSec: Number(m.intervalSec || 0),
        expiry: Number(on?.expiry ?? m.expiry),
        status: on?.status ?? m.status ?? null,
        poolAddress: m.poolAddress || null,
        symbol: m.outcomes?.[0]?.symbol || null,
        lastPrice: m.lastPrice == null ? null : Number(m.lastPrice),
        bestBid: book?.yesBids?.[0]?.[0] ?? null,
        bestAsk: book?.yesAsks?.[0]?.[0] ?? null,
        volume: Number(m.cumulativeQuoteVolume || 0),
        tradeCount: Number(m.tradeCount || 0),
      };
    }),
  );
}
app.get('/api/markets', async (_q, r) => {
  try {
    const markets = await discover();
    const s = surface(markets);
    const sig = signals(s);
    recordSnapshot({ at: Date.now(), markets });
    r.json({ at: Date.now(), markets, surface: s, signals: sig });
  } catch (e) {
    r.status(502).json({ error: String(e) });
  }
});
app.get('/api/markets/finalized', async (_q, r) => {
  try {
    const ex = createExchange();
    const rows = await ex.client.listBinaryMarkets({ status: 'Finalized' } as any);
    r.json({ markets: rows.slice(0, 200) });
  } catch (e) {
    r.status(502).json({ error: String(e) });
  }
});
app.get('/api/portfolio/:address', async (req, r) => {
  try {
    const ex = createExchange();
    const address = req.params.address.toLowerCase();
    let portfolio: any = null;
    try {
      portfolio = await (ex.client as any).getPortfolio(address);
    } catch {}
    r.json({ address, portfolio, local: dbGet().trades.filter((t) => t.address === address) });
  } catch (e) {
    r.status(502).json({ error: String(e) });
  }
});
app.get('/api/history', (_q, r) => r.json({ snapshots: dbGet().snapshots.slice(-500) }));
app.post('/api/strategy', async (req, r) => {
  const st = req.body as Strategy;
  const v = validateStrategy(st);
  if (!v.ok) return r.status(400).json(v);
  saveStrategy(st);
  r.json({ strategy: st, scenarios: scenarios(st) });
});
app.get('/api/strategies', (_q, r) => r.json(dbGet().strategies));
app.post('/api/paper/simulate', async (req, r) => {
  const st = req.body as Strategy;
  const v = validateStrategy(st);
  if (!v.ok) return r.status(400).json(v);
  r.json({ strategy: st, scenarios: scenarios(st), mode: 'PAPER' });
});
app.post('/api/ai/explain', async (req, r) => {
  const { facts } = req.body || {};
  if (!process.env.AI_BASE_URL || !process.env.AI_API_KEY || !process.env.AI_MODEL)
    return r.json({
      available: false,
      explanation:
        'AI provider is not configured. SyncPact can still calculate and execute without AI.',
    });
  try {
    const response = await fetch(process.env.AI_BASE_URL.replace(/\/$/, '') + '/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You explain structured trading facts only. Never invent market prices, fills, probabilities, settlement or blockchain state. Say when facts are insufficient.',
          },
          { role: 'user', content: JSON.stringify(facts) },
        ],
        temperature: 0.1,
      }),
    });
    const j: any = await response.json();
    r.json({
      available: true,
      explanation: j.choices?.[0]?.message?.content || 'No explanation returned.',
    });
  } catch (e) {
    r.status(502).json({ error: String(e) });
  }
});
async function walletGuard() {
  if (process.env.NETWORK !== 'testnet') throw Error('Execution is testnet-only in this release.');
  if (process.env.ENABLE_LIVE_TRADING !== 'true') throw Error('ENABLE_LIVE_TRADING is false.');
  if (!process.env.PRIVATE_KEY) throw Error('PRIVATE_KEY is missing.');
}
app.post('/api/onchain/prepare', async (req, r) => {
  try {
    const { marketId } = req.body;
    const pc = publicClient();
    const x = await pc.readContract({
      address: ADDRESSES.BinaryMarketsModule,
      abi: moduleAbi,
      functionName: 'markets',
      args: [hex(marketId)],
    });
    r.json({
      marketId,
      pool: x[8 + 1],
      collateral: x[3],
      yesId: x[10],
      noId: x[11],
      tradingStart: x[12],
      expiry: x[13],
    });
  } catch (e) {
    r.status(400).json({ error: String(e) });
  }
});
app.post('/api/onchain/mint', async (req, r) => {
  try {
    await walletGuard();
    const { marketId, amount } = req.body;
    const pc = publicClient();
    const x: any = await pc.readContract({
      address: ADDRESSES.BinaryMarketsModule,
      abi: moduleAbi,
      functionName: 'markets',
      args: [hex(marketId)],
    });
    const { account, client } = serverWallet();
    const collateral = x[3] as `0x${string}`;
    const decimals = await pc.readContract({
      address: collateral,
      abi: erc20Abi,
      functionName: 'decimals',
    });
    const raw = BigInt(amount);
    const approval = await client.writeContract({
      account,
      address: collateral,
      abi: erc20Abi,
      functionName: 'approve',
      args: [ADDRESSES.BinaryMarketsModule, raw],
    });
    const tx = await client.writeContract({
      account,
      address: ADDRESSES.BinaryMarketsModule,
      abi: moduleAbi,
      functionName: 'mintCompleteSet',
      args: [
        0,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        hex(marketId),
        raw,
      ],
    });
    r.json({ ok: true, approvalTx: approval, txHash: tx, rawAmount: raw.toString(), decimals });
  } catch (e) {
    r.status(400).json({ error: String(e) });
  }
});
app.post('/api/onchain/merge', async (req, r) => {
  try {
    await walletGuard();
    const { marketId, amount } = req.body;
    const { account, client } = serverWallet();
    const tx = await client.writeContract({
      account,
      address: ADDRESSES.BinaryMarketsModule,
      abi: moduleAbi,
      functionName: 'mergeCompleteSet',
      args: [
        0,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        hex(marketId),
        BigInt(amount),
      ],
    });
    r.json({ ok: true, txHash: tx });
  } catch (e) {
    r.status(400).json({ error: String(e) });
  }
});
app.get('/api/onchain/state/:marketId', async (req, r) => {
  try {
    const ex = createExchange();
    const on: any = await ex.client.getMarketOnchain(hex(req.params.marketId));
    r.json({ marketId: req.params.marketId, onchain: on });
  } catch (e) {
    r.status(400).json({ error: String(e) });
  }
});
app.post('/api/onchain/redeem', async (req, r) => {
  try {
    await walletGuard();
    const { marketId, outcomeIdx, amount } = req.body;
    const { account, client } = serverWallet();
    const tx = await client.writeContract({
      account,
      address: ADDRESSES.BinaryMarketsModule,
      abi: moduleAbi,
      functionName: 'redeem',
      args: [
        0,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        hex(marketId),
        Number(outcomeIdx),
        BigInt(amount),
      ],
    });
    r.json({ ok: true, txHash: tx });
  } catch (e) {
    r.status(400).json({ error: String(e) });
  }
});
app.get('/api/onchain/balance/:address/:token', async (req, r) => {
  try {
    const pc = publicClient();
    const balance = await pc.readContract({
      address: req.params.token as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [req.params.address as `0x${string}`],
    });
    r.json({ balance: balance.toString() });
  } catch (e) {
    r.status(400).json({ error: String(e) });
  }
});
app.post('/api/reconcile', async (req, r) => {
  try {
    const ex = createExchange();
    const address = req.body.address;
    const fn = (ex.client as any).getPortfolio;
    if (typeof fn === 'function')
      return r.json({ ok: true, portfolio: await fn.call(ex.client, address) });
    const fills = (ex.client as any).getOwnFills;
    if (typeof fills === 'function')
      return r.json({ ok: true, fills: await fills.call(ex.client, address) });
    r.json({
      ok: true,
      message:
        'SDK release does not expose portfolio/fill helper; use the event ledger and on-chain explorer.',
    });
  } catch (e) {
    r.status(400).json({ error: String(e) });
  }
});
app.post('/api/execute', async (req, r) => {
  try {
    await walletGuard();
    const { symbol, side: rawSide = 'buy', quantity, price } = req.body;
    const side = String(rawSide).toLowerCase() === 'sell' ? 'sell' : 'buy';
    const ex = createExchange();
    const markets = Object.values(await ex.loadMarkets(true));
    const m: any = markets.find((x: any) => x.outcomes?.some((o: any) => o.symbol === symbol));
    if (!m) throw Error('Symbol not found in current live markets.');
    const info: any = m.info;
    const on = await ex.client.getMarketOnchain(hex(info.marketId));
    if (on.status !== 1) throw Error(`Market not Trading: ${on.status}`);
    if (Number(on.expiry) - Date.now() / 1000 < 60) throw Error('Expiry headroom < 60 seconds.');
    const order = await ex.createOrder(symbol, 'limit', side, Number(quantity), Number(price), {
      timeInForce: 'IOC',
    });
    const receipt = (order as any).info?.receipt;
    const row = {
      address: 'server-wallet',
      symbol,
      side,
      quantity,
      price,
      orderId: (order as any).id,
      txHash: receipt?.transactionHash || null,
      at: Date.now(),
    };
    recordTrade(row);
    r.json({ ok: true, ...row });
  } catch (e) {
    r.status(400).json({ error: String(e) });
  }
});
// Serve the Vite production frontend
app.use(express.static('dist'));

app.listen(port, '0.0.0.0', () =>
  console.log(`SyncPact API listening on port ${port}`)
);
