# SyncPact 1.0 — Testnet Build

**Compose. Simulate. Execute Event Contracts.**

This archive is the expanded SyncPact implementation requested for the Somnia × DreamDEX Event Contracts hackathon. It preserves the original design principle and adds the missing product layers: real multi-leg strategy objects, deterministic payoff simulation, persistent server state, wallet connection, portfolio/history surfaces, finalized-market replay entry point, AI explanation, settlement, mint/merge and redemption endpoints, and guarded testnet execution.

## Non-negotiable safety model

- Shannon testnet only in this release.
- `ENABLE_LIVE_TRADING=false` by default.
- Private key is never placed in the frontend.
- Browser wallet connection is for address/identity and can be extended to direct signing.
- Server execution requires a dedicated testnet private key and explicit enablement.
- Every live order re-discovers the market and checks on-chain status before writing.
- Expiry headroom is checked.
- IOC is used for taker execution.
- AI receives structured facts and is explicitly instructed not to invent prices, fills, probabilities, or settlement.

## Run

```bash
npm install
copy .env.example .env
npm run typecheck
npm test
npm run inspect:markets
npm run dev
```

Open `http://localhost:5173`.

## Wallet

Click **Connect wallet**. The frontend requests an injected EVM wallet and switches/adds Somnia Shannon testnet (chain 50312). You need STT for gas. Event Contract collateral is separate.

## Testnet execution

Keep the default off until discovery and paper simulation work:

```env
ENABLE_LIVE_TRADING=false
```

For a dedicated test wallet only:

```env
PRIVATE_KEY=0x...
ENABLE_LIVE_TRADING=true
```

Do not use a mainnet/private production key.

## Features

### Live market intelligence
- Event Contract discovery
- order book reads
- probability surface
- cross-window deviation
- liquidity/spread/expiry metrics

### Strategy composition
- multi-leg strategy model
- UP/DOWN + BUY/SELL legs
- capital and loss constraints
- deterministic BULL / FLAT / BEAR / REVERSAL payoff scenarios

### Execution
- on-chain lifecycle gate
- expiry guard
- IOC execution
- persistent trade record
- receipt/tx hash capture

### Wallet / portfolio
- injected EVM wallet connection
- address-aware portfolio API
- local execution ledger
- persistent JSON database

### Settlement / replay
- finalized market discovery endpoint
- settlement-ready portfolio architecture
- mint/redeem SDK integration hooks
- local market snapshots for replay

### AI
Optional OpenAI Chat Completions-compatible provider:

```env
AI_BASE_URL=https://...
AI_API_KEY=...
AI_MODEL=...
```

AI is an explanation layer, not the source of truth.

## Architecture

```text
Somnia / DreamDEX
       ↓
Markets SDK + on-chain reads
       ↓
Market Data Layer
       ↓
Probability Surface
       ↓
Cross-window Engine
       ↓
Strategy Composer
       ↓
Scenario / Payoff Engine
       ↓
Risk / Execution Guard
       ↓
Testnet Execution
       ↓
Fill Ledger / Settlement / Replay
       ↓
AI Explanation
```

**AI explains. Code calculates. Blockchain proves.**

## Important limitation

The SDK is actively evolving. Mint/merge and redemption use the deployed BinaryMarketsModule ABI directly, while market discovery/order-book/execution uses the SDK. This avoids claiming an SDK helper exists when a release renames it. The README intentionally does not claim a blockchain transaction succeeded unless a real transaction result is returned.

## Official sources

- DreamDEX Event Contracts: https://app.dreamdex.io/docs/developers/event-contracts
- Event Contract recipes: https://app.dreamdex.io/docs/developers/event-contracts/recipes
- Market structure: https://app.dreamdex.io/docs/developers/event-contracts/market-structure
- Somnia Markets SDK: https://prd.smk.somnia.host/docs/typescript
- Raw contract integration: https://prd.smk.somnia.host/docs/contracts/raw-integration
- DreamDEX Bot Kit: https://github.com/somnia-chain/dreamdex-bot-kit
