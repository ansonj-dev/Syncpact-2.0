import { createExchange } from '../server/somnia.js';
const ex = createExchange();
const rows = await ex.client.listLiveBinaryMarkets({});
console.log(`Found ${rows.length} live binary markets.`);
for (const m of rows.slice(0, 50)) {
  let on: any;
  try {
    on = await ex.client.getMarketOnchain(m.marketId as `0x${string}`);
  } catch (e) {
    on = { error: String(e) };
  }
  console.log(
    JSON.stringify({
      marketId: m.marketId,
      asset: m.asset,
      intervalSec: m.intervalSec,
      expiry: m.expiry,
      status: on.status,
      pool: m.poolAddress,
      outcomes: (m as any).outcomes?.map((x: any) => x.symbol),
    }),
  );
}
