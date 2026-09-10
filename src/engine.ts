export type Market = {
  marketId: string;
  asset: string;
  intervalSec: number;
  expiry: number;
  bestBid: number | null;
  bestAsk: number | null;
  lastPrice: number | null;
  volume?: number;
  tradeCount?: number;
  poolAddress?: string;
  symbol?: string | null;
  status?: number | string;
};
export type Point = Market & {
  mid: number | null;
  upProbability: number | null;
  secondsRemaining: number;
  spread: number | null;
  liquidityScore: number;
};
export function mid(m: Market) {
  return m.bestBid != null && m.bestAsk != null ? (m.bestBid + m.bestAsk) / 2 : m.lastPrice;
}
export function surface(ms: Market[]) {
  const now = Date.now() / 1000,
    out: Record<string, Point[]> = {};
  for (const m of ms) {
    const x = mid(m),
      spread = m.bestBid != null && m.bestAsk != null ? m.bestAsk - m.bestBid : null;
    const p: Point = {
      ...m,
      mid: x,
      upProbability: x,
      secondsRemaining: Math.max(0, m.expiry - now),
      spread,
      liquidityScore: Math.max(0, 1 - (spread ?? 0.5)),
    };
    (out[m.asset] ??= []).push(p);
  }
  for (const a in out) out[a].sort((x, y) => x.intervalSec - y.intervalSec);
  return out;
}
export function signals(s: Record<string, Point[]>) {
  return Object.entries(s).flatMap(([asset, p]) => {
    const u = p.filter((x) => x.upProbability != null);
    if (u.length < 2) return [];
    const fast = u[0],
      slow = u.at(-1)!;
    const deviation = fast.upProbability! - slow.upProbability!;
    return [
      {
        asset,
        fast,
        slow,
        deviation,
        label:
          Math.abs(deviation) < 0.035
            ? 'CONSISTENT'
            : deviation > 0
              ? 'BULLISH_TILT'
              : 'BEARISH_TILT',
      },
    ];
  });
}
export type Leg = {
  marketId: string;
  asset: string;
  intervalSec: number;
  outcome: 'UP' | 'DOWN';
  side: 'BUY' | 'SELL';
  quantity: number;
  limitPrice: number;
  symbol?: string;
};
export type Strategy = {
  id: string;
  name: string;
  legs: Leg[];
  maxCapital: number;
  maxLoss: number;
  createdAt: number;
  status: 'DRAFT' | 'PAPER' | 'LIVE' | 'SETTLED';
};
export function validateStrategy(st: Strategy) {
  const issues: string[] = [];
  if (!st.legs.length) issues.push('At least one leg is required.');
  if (st.maxCapital <= 0) issues.push('Max capital must be positive.');
  for (const l of st.legs) {
    if (l.quantity <= 0) issues.push(`${l.marketId}: quantity must be positive`);
    if (l.limitPrice <= 0 || l.limitPrice >= 1)
      issues.push(`${l.marketId}: price must be between 0 and 1`);
  }
  return { ok: !issues.length, issues };
}
export function simulate(st: Strategy, scenario: 'BULL' | 'FLAT' | 'BEAR' | 'REVERSAL') {
  let cost = 0,
    payout = 0;
  for (const l of st.legs) {
    const win =
      l.outcome === 'UP'
        ? scenario === 'BULL' || (scenario === 'REVERSAL' && l.intervalSec <= 300)
        : scenario === 'BEAR' || (scenario === 'REVERSAL' && l.intervalSec > 300);
    const stake = l.quantity * l.limitPrice;
    cost += l.side === 'BUY' ? stake : 0;
    if (l.side === 'BUY') payout += win ? l.quantity : 0;
    else payout += win ? 0 : -l.quantity * (1 - l.limitPrice);
  }
  return { scenario, cost, payout, pnl: payout - cost };
}
export function scenarios(st: Strategy) {
  return (['BULL', 'FLAT', 'BEAR', 'REVERSAL'] as const).map((x) => simulate(st, x));
}
