import { surface, signals, validateStrategy, scenarios, type Strategy } from '../src/engine.js';
const now = Date.now() / 1000;
const s = surface([
  {
    marketId: 'a',
    asset: 'BTC',
    intervalSec: 300,
    expiry: now + 300,
    bestBid: 0.6,
    bestAsk: 0.62,
    lastPrice: 0.61,
  },
  {
    marketId: 'b',
    asset: 'BTC',
    intervalSec: 900,
    expiry: now + 900,
    bestBid: 0.53,
    bestAsk: 0.55,
    lastPrice: 0.54,
  },
]);
if (signals(s)[0].label !== 'BULLISH_TILT') throw Error('signal');
const st: Strategy = {
  id: 'x',
  name: 'test',
  legs: [
    {
      marketId: 'a',
      asset: 'BTC',
      intervalSec: 300,
      outcome: 'UP',
      side: 'BUY',
      quantity: 1,
      limitPrice: 0.61,
    },
  ],
  maxCapital: 2,
  maxLoss: 1,
  createdAt: Date.now(),
  status: 'PAPER',
};
if (!validateStrategy(st).ok || scenarios(st).length !== 4) throw Error('strategy');
console.log('All local SyncPact engine tests passed.');
