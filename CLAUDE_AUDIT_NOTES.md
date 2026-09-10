# Audit notes — 9 September 2026

This file documents what was actually verified and changed after the "FINAL 1.0"
report. Delete it before submission if you don't want it in the archive — it's
here for your own records, not for judges.

## Critical bug found and fixed: the app could not start

`server/contracts.ts`, `server/somnia.ts`, and `src/wallet.ts` all imported a
chain object called `somniaShannon` that does not exist:

- `viem/chains` exports `somnia` (mainnet, id 5031) and `somniaTestnet`
  (id 50312) — not `somniaShannon`.
- `@somnia-chain/markets-sdk/chains` is not a real subpath of the published
  package at all (confirmed against the package's `exports` map on npm).

Running `tsx server/index.ts` crashed immediately with
`ERR_PACKAGE_PATH_NOT_EXPORTED`. This means the "testnet-ready" build in the
archive had never actually been started successfully — every "DONE" status in
REPORT.md was true only in the sense that the code existed on disk, not that
it ran.

**Fix applied:** switched all three files to `somniaTestnet` from `viem/chains`
(chain id 50312 matches your hardcoded `CHAIN_ID`/`chainId` values and the
`shannon-explorer.somnia.network` block explorer, so this is definitely the
right chain). Also fixed a related strict-mode type error: the SDK's
`wsRpcUrl` config field is a required `string`, and the code was trying to
read a `.webSocket` property that doesn't exist on viem's chain type. Added a
`WS_RPC_URL` env var (defaults to `wss://dream-rpc.somnia.network/ws`) instead.

Verified after the fix: `npm install`, `npm run typecheck`, `npm test`,
`npm run build` all pass clean, and the server boots and answers
`GET /api/health`. (Live RPC/indexer calls couldn't be verified from the
sandbox this was audited in — that part needs a real network to confirm.)

## Things that were actually correct (no bug)

The manual ABI in `server/contracts.ts` for the `BinaryMarketsModule.markets()`
getter was checked field-by-field against the real ABI shipped inside
`@somnia-chain/markets-sdk` — every index (`collateral` at `x[3]`, `pool` at
`x[9]`, `yesId`/`noId` at `x[10]`/`x[11]`, `tradingStart`/`expiry` at
`x[12]`/`x[13]`) matches. Same for the `mintCompleteSet` / `mergeCompleteSet`
/ `redeem` argument order. This part was built correctly.

## Gap found and partially fixed: most of the backend was invisible in the UI

Before this pass, `src/main.tsx` only ever called `/api/markets`,
`/api/paper/simulate`, `/api/ai/explain`, `/api/portfolio/:address`, and
`/api/markets/finalized`. Everything the report calls out as the product's
differentiator — `/api/execute`, `/api/onchain/mint`, `/api/onchain/merge`,
`/api/onchain/redeem`, `/api/reconcile`, `/api/strategy` — existed only as
curl-able routes with no button anywhere in the app.

**Fix applied:** added an "Execute (testnet)" button per leg in the composer
(logs real attempts, including safety-gate rejections, to a visible
execution log), a "Save strategy" button, and a Settlement Tools panel in the
Portfolio tab wiring up prepare/mint/merge/redeem/balance/reconcile. `npm run
dev` now demos the full DATA → STRATEGY → SIMULATION → EXECUTION → SETTLEMENT
loop the README claims, without needing a terminal.

Also fixed: `/api/execute` accepted `side` case-sensitively ('buy'/'sell'),
but the app's own `Leg` type and composer UI use uppercase `'BUY'/'SELL'`.
Once the leg objects started flowing into `/api/execute` this would have
silently mismatched the SDK's expected values. Normalized case server-side.

## Not verified (needs your test wallet + real network)

- Live market discovery / order book reads against the actual indexer
- Actual signed testnet transactions (mint/merge/redeem/execute)
- The AI explanation endpoint against a real provider

## Formatting

Ran Prettier over `server/`, `src/`, and `scripts/` — no logic changes, just
made the file readable for anyone (including judges) opening it on GitHub.

## UX/UI pass — 9 September 2026 (follow-up)

Pure front-end pass, no logic or API changes:

- Added a real type pairing (Inter for UI, JetBrains Mono for numeric/data —
  prices, addresses, tx hashes) via Google Fonts in `index.html`.
- Replaced every `alert()` (portfolio refresh, finalized-market replay) with
  an inline result panel plus a toast notification system (`.toasts`), so
  nothing blocks the page anymore.
- Added loading skeletons for the market grid on first load, and empty
  states everywhere a list could be empty (no live markets, no signals, no
  legs, no execution/settlement history yet) so the UI explains itself
  instead of just looking broken or unfinished.
- Labeled every field in the leg editor (Outcome / Side / Qty / Limit price)
  instead of a bare row of unlabeled inputs.
- Per-action busy states with a small spinner on the exact button clicked,
  instead of a single global "loading" flag.
- Copy-to-clipboard affordances for the wallet address, the selected market
  ID, and long tx hashes (all truncated with an ellipsis in the middle so
  the meaningful ends stay visible).
- Refined the color/spacing/radius tokens for contrast and consistency, and
  fixed responsive layout for the settlement fields grid and leg rows on
  narrow screens.

Re-verified: `npm run typecheck`, `npm test`, and `npm run build` all pass
after these changes.
