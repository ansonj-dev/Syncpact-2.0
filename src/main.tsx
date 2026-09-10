import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { connectWallet, type WalletState } from './wallet';

type M = {
  marketId: string;
  asset: string;
  intervalSec: number;
  expiry: number;
  bestBid: number | null;
  bestAsk: number | null;
  lastPrice: number | null;
  volume: number;
  poolAddress: string | null;
  symbol: string | null;
};
type D = { markets: M[]; signals: any[]; surface: any };
type Toast = { id: string; type: 'ok' | 'fail'; message: string };

const pct = (x: any) => (x == null ? '—' : (x * 100).toFixed(1) + '%');
const left = (e: number) => {
  const s = Math.max(0, e - Date.now() / 1000);
  return s < 60 ? `${Math.floor(s)}s` : `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
};
const short = (x?: string | null, head = 8, tail = 5) =>
  !x ? '' : x.length > head + tail + 1 ? `${x.slice(0, head)}…${x.slice(-tail)}` : x;
const timeAgo = (t: number) => {
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
};

function App() {
  const [data, setData] = useState<D | null>(null),
    [err, setErr] = useState(''),
    [wallet, setWallet] = useState<WalletState>({ address: null, connected: false }),
    [tab, setTab] = useState('surface'),
    [sel, setSel] = useState<M | null>(null),
    [legs, setLegs] = useState<any[]>([]),
    [name, setName] = useState('SyncPact strategy'),
    [maxCapital, setMaxCapital] = useState('10'),
    [sim, setSim] = useState<any[]>([]),
    [ai, setAi] = useState(''),
    [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [composerBusy, setComposerBusy] = useState<null | 'sim' | 'save' | 'ai'>(null);
  const [execBusyIdx, setExecBusyIdx] = useState<number | null>(null);
  const [execLog, setExecLog] = useState<any[]>([]);
  const [portfolioBusy, setPortfolioBusy] = useState(false);
  const [portfolioResult, setPortfolioResult] = useState<any>(null);
  const [replayBusy, setReplayBusy] = useState(false);
  const [replayResult, setReplayResult] = useState<any>(null);
  const [settleMarketId, setSettleMarketId] = useState(''),
    [settleAmount, setSettleAmount] = useState('1000000'),
    [settleOutcomeIdx, setSettleOutcomeIdx] = useState('0'),
    [settleToken, setSettleToken] = useState(''),
    [settleBusyAction, setSettleBusyAction] = useState<string | null>(null),
    [settleLog, setSettleLog] = useState<any[]>([]);

  function toast(type: 'ok' | 'fail', message: string) {
    const id = crypto.randomUUID();
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }
  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((k) => (k === key ? null : k)), 1100);
    } catch {
      toast('fail', 'Clipboard blocked by the browser — copy manually.');
    }
  }

  async function load(manual = false) {
    try {
      setLoading(true);
      const r = await fetch('/api/markets');
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      setData(j);
      setErr('');
      if (manual) toast('ok', `Synced — ${j.markets.length} live markets.`);
    } catch (e) {
      setErr(String(e));
      if (manual) toast('fail', 'Sync failed — see the banner above.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(() => load(false), 5000);
    return () => clearInterval(t);
  }, []);

  const groups = useMemo(() => {
    const m = new Map<string, M[]>();
    for (const x of data?.markets || [])
      (m.get(x.asset) || m.set(x.asset, []).get(x.asset)!).push(x);
    return [...m];
  }, [data]);

  function add() {
    if (!sel) return;
    setLegs((x) => [
      ...x,
      {
        marketId: sel.marketId,
        asset: sel.asset,
        intervalSec: sel.intervalSec,
        outcome: 'UP',
        side: 'BUY',
        quantity: 1,
        limitPrice: sel.bestAsk ?? sel.lastPrice ?? 0.5,
        symbol: sel.symbol,
      },
    ]);
    toast('ok', `Added ${sel.asset} · ${Math.round(sel.intervalSec / 60)}m leg to the strategy.`);
  }
  async function simulate() {
    setComposerBusy('sim');
    try {
      const st = {
        id: crypto.randomUUID(),
        name,
        legs,
        maxCapital: Number(maxCapital),
        maxLoss: Number(maxCapital),
        createdAt: Date.now(),
        status: 'PAPER',
      };
      const r = await fetch('/api/paper/simulate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(st),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error || 'Simulation failed.');
      setSim(j.scenarios || []);
      toast('ok', `Simulated ${j.scenarios?.length ?? 0} scenarios.`);
    } catch (e) {
      toast('fail', String(e));
    } finally {
      setComposerBusy(null);
    }
  }
  async function saveStrategy() {
    setComposerBusy('save');
    try {
      const st = {
        id: crypto.randomUUID(),
        name,
        legs,
        maxCapital: Number(maxCapital),
        maxLoss: Number(maxCapital),
        createdAt: Date.now(),
        status: 'DRAFT',
      };
      const r = await fetch('/api/strategy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(st),
      });
      const j = await r.json();
      if (!r.ok) throw Error((j.issues || [j.error]).join(', '));
      toast('ok', `Saved “${name}”.`);
    } catch (e) {
      toast('fail', String(e));
    } finally {
      setComposerBusy(null);
    }
  }
  async function explain() {
    setComposerBusy('ai');
    try {
      const r = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          facts: { signals: data?.signals, selected: sel, legs, scenarios: sim },
        }),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error || 'AI unavailable.');
      setAi(j.explanation || 'AI unavailable');
    } catch (e) {
      toast('fail', String(e));
    } finally {
      setComposerBusy(null);
    }
  }
  async function executeLeg(l: any, i: number) {
    if (!l.symbol) {
      toast('fail', 'This leg has no resolved outcome symbol — reselect it from Surface.');
      return;
    }
    setExecBusyIdx(i);
    try {
      const r = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          symbol: l.symbol,
          side: l.side,
          quantity: l.quantity,
          price: l.limitPrice,
        }),
      });
      const j = await r.json();
      setExecLog((x) => [{ at: Date.now(), ok: r.ok, ...j }, ...x]);
      toast(r.ok ? 'ok' : 'fail', r.ok ? 'Order accepted.' : j.error || 'Execution blocked.');
    } catch (e) {
      setExecLog((x) => [{ at: Date.now(), ok: false, error: String(e) }, ...x]);
      toast('fail', String(e));
    } finally {
      setExecBusyIdx(null);
    }
  }
  async function settle(action: 'prepare' | 'mint' | 'merge' | 'redeem' | 'balance' | 'reconcile') {
    setSettleBusyAction(action);
    try {
      let r: Response;
      if (action === 'balance')
        r = await fetch(`/api/onchain/balance/${wallet.address}/${settleToken}`);
      else if (action === 'reconcile')
        r = await fetch('/api/reconcile', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ address: wallet.address }),
        });
      else if (action === 'prepare')
        r = await fetch('/api/onchain/prepare', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ marketId: settleMarketId }),
        });
      else
        r = await fetch(`/api/onchain/${action}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            marketId: settleMarketId,
            amount: settleAmount,
            outcomeIdx: Number(settleOutcomeIdx),
          }),
        });
      const j = await r.json();
      setSettleLog((x) => [{ at: Date.now(), action, ok: r.ok, ...j }, ...x]);
      toast(r.ok ? 'ok' : 'fail', r.ok ? `${action} succeeded.` : j.error || `${action} blocked.`);
    } catch (e) {
      setSettleLog((x) => [{ at: Date.now(), action, ok: false, error: String(e) }, ...x]);
      toast('fail', String(e));
    } finally {
      setSettleBusyAction(null);
    }
  }
  async function refreshPortfolio() {
    setPortfolioBusy(true);
    try {
      const r = await fetch('/api/portfolio/' + wallet.address);
      const j = await r.json();
      setPortfolioResult(j);
      toast(r.ok ? 'ok' : 'fail', r.ok ? 'Portfolio refreshed.' : j.error || 'Refresh failed.');
    } catch (e) {
      toast('fail', String(e));
    } finally {
      setPortfolioBusy(false);
    }
  }
  async function loadFinalized() {
    setReplayBusy(true);
    try {
      const r = await fetch('/api/markets/finalized');
      const j = await r.json();
      setReplayResult(j);
      toast('ok', `${j.markets?.length ?? 0} finalized markets loaded.`);
    } catch (e) {
      toast('fail', String(e));
    } finally {
      setReplayBusy(false);
    }
  }

  return (
    <div className="app">
      <header>
        <div>
          <div className="eyebrow">SOMNIA × DREAMDEX</div>
          <h1>
            Sync<span>Pact</span>
          </h1>
          <p>Compose, simulate, and execute multi-leg strategies on Event Contracts.</p>
        </div>
        <div className="top">
          {wallet.connected ? (
            <span className="wallet-btn">
              <i className="dot on" />
              <code>{short(wallet.address)}</code>
              <button className="copy-btn" onClick={() => copy(wallet.address || '', 'wallet')}>
                {copied === 'wallet' ? 'copied' : 'copy'}
              </button>
            </span>
          ) : (
            <button
              onClick={async () => {
                try {
                  setWallet(await connectWallet());
                  toast('ok', 'Wallet connected.');
                } catch (e) {
                  toast('fail', String(e));
                }
              }}
            >
              Connect wallet
            </button>
          )}
          <span className="network-pill">
            <i className="dot on" />
            Shannon testnet
          </span>
          <button className={loading ? 'btn-busy' : ''} onClick={() => load(true)}>
            Refresh
          </button>
        </div>
      </header>
      <nav>
        {['surface', 'composer', 'portfolio', 'replay'].map((x) => (
          <button className={tab === x ? 'active' : ''} onClick={() => setTab(x)} key={x}>
            {x}
          </button>
        ))}
      </nav>
      {err && <div className="error">{err}</div>}
      {tab === 'surface' && (
        <>
          <section className="hero">
            <div>
              <div className="kicker">PROBABILITY SURFACE</div>
              <h2>Connected windows, not isolated bets.</h2>
              <p>
                SyncPact reads live Event Contracts and exposes the structural relationship between
                short and long windows.
              </p>
            </div>
            <div className="stat">
              <b>{data?.markets.length ?? '—'}</b>
              <span>live markets</span>
            </div>
            <div className="stat">
              <b>{data?.signals.length ?? '—'}</b>
              <span>signals</span>
            </div>
          </section>
          <section className="panel">
            <div className="head">
              <h3>Live Event Contracts</h3>
              <span>Up price = market-implied probability</span>
            </div>
            {!data && loading && (
              <div className="grid">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div className="skeleton skeleton-card" key={i} />
                ))}
              </div>
            )}
            {data && groups.length === 0 && (
              <div className="empty">
                <b>No live markets right now</b>
                The indexer returned an empty set — this refreshes every 5 seconds on its own.
              </div>
            )}
            {groups.map(([a, ms]) => (
              <div className="asset" key={a}>
                <b>{a}</b>
                <div className="grid">
                  {ms
                    .sort((x, y) => x.intervalSec - y.intervalSec)
                    .map((m) => {
                      const spread =
                        m.bestBid != null && m.bestAsk != null
                          ? Math.max(0, Math.min(1, 1 - (m.bestAsk - m.bestBid)))
                          : null;
                      return (
                        <button
                          className={sel?.marketId === m.marketId ? 'card selected' : 'card'}
                          onClick={() => setSel(m)}
                          key={m.marketId}
                        >
                          <div>
                            <span>{Math.round(m.intervalSec / 60)}m</span>
                            <i>{left(m.expiry)}</i>
                          </div>
                          <strong>{pct(m.lastPrice ?? m.bestAsk)}</strong>
                          {spread != null && (
                            <div className="spread-bar">
                              <i style={{ width: `${spread * 100}%` }} />
                            </div>
                          )}
                          <small>
                            bid {pct(m.bestBid)} · ask {pct(m.bestAsk)}
                          </small>
                          <code>{short(m.marketId, 10, 0)}</code>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </section>
          <section className="two">
            <div className="panel">
              <div className="kicker">CROSS-WINDOW ENGINE</div>
              {(data?.signals || []).length === 0 ? (
                <div className="empty">
                  <b>No divergence signals yet</b>
                  These appear once windows on the same asset drift apart.
                </div>
              ) : (
                (data?.signals || []).map((s) => (
                  <div className="signal" key={s.asset}>
                    <span>
                      {s.asset} · {s.label.replaceAll('_', ' ')}
                    </span>
                    <b>{(s.deviation * 100).toFixed(1)}pp</b>
                  </div>
                ))
              )}
            </div>
            <div className="panel">
              <div className="kicker">MARKET QUALITY</div>
              <p className="muted">
                Each live point exposes bid/ask spread, remaining time and liquidity score to the
                strategy engine. No probability is fabricated.
              </p>
            </div>
          </section>
        </>
      )}
      {tab === 'composer' && (
        <>
          <section className="panel">
            <div className="head">
              <div>
                <div className="kicker">STRATEGY COMPOSER</div>
                <h3>Build a real multi-leg strategy</h3>
                {sel && (
                  <p className="muted">
                    Selected: {sel.asset} · {Math.round(sel.intervalSec / 60)}m ·{' '}
                    <code>{short(sel.marketId, 10, 4)}</code>{' '}
                    <button className="copy-btn" onClick={() => copy(sel.marketId, 'selid')}>
                      {copied === 'selid' ? 'copied' : 'copy id'}
                    </button>
                  </p>
                )}
              </div>
              <button onClick={add} disabled={!sel}>
                + Add selected leg
              </button>
            </div>
            <div className="fields">
              <label>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Max capital
                <input
                  value={maxCapital}
                  onChange={(e) => setMaxCapital(e.target.value)}
                  type="number"
                />
              </label>
            </div>
            {legs.length === 0 ? (
              <div className="empty" style={{ marginTop: 16 }}>
                <b>No legs yet</b>
                Pick a market in Surface, then use “+ Add selected leg” above.
              </div>
            ) : (
              legs.map((l, i) => (
                <div className="leg" key={i}>
                  <div className="leg-field">
                    <span>MARKET</span>
                    <div className="mono" style={{ padding: '8px 0' }}>
                      {l.asset} · {Math.round(l.intervalSec / 60)}m
                    </div>
                  </div>
                  <div className="leg-field">
                    <span>OUTCOME</span>
                    <select
                      value={l.outcome}
                      onChange={(e) =>
                        setLegs((x) =>
                          x.map((q, j) => (j === i ? { ...q, outcome: e.target.value } : q)),
                        )
                      }
                    >
                      <option>UP</option>
                      <option>DOWN</option>
                    </select>
                  </div>
                  <div className="leg-field">
                    <span>SIDE</span>
                    <select
                      value={l.side}
                      onChange={(e) =>
                        setLegs((x) =>
                          x.map((q, j) => (j === i ? { ...q, side: e.target.value } : q)),
                        )
                      }
                    >
                      <option>BUY</option>
                      <option>SELL</option>
                    </select>
                  </div>
                  <div className="leg-field">
                    <span>QTY</span>
                    <input
                      value={l.quantity}
                      type="number"
                      onChange={(e) =>
                        setLegs((x) =>
                          x.map((q, j) =>
                            j === i ? { ...q, quantity: Number(e.target.value) } : q,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="leg-field">
                    <span>LIMIT PRICE</span>
                    <input
                      value={l.limitPrice}
                      type="number"
                      step=".0001"
                      onChange={(e) =>
                        setLegs((x) =>
                          x.map((q, j) =>
                            j === i ? { ...q, limitPrice: Number(e.target.value) } : q,
                          ),
                        )
                      }
                    />
                  </div>
                  <button
                    className={execBusyIdx === i ? 'btn-busy' : ''}
                    disabled={execBusyIdx !== null}
                    onClick={() => executeLeg(l, i)}
                    title="Sends this leg to /api/execute as a real IOC order. Blocked unless ENABLE_LIVE_TRADING=true on the server."
                  >
                    Execute (testnet)
                  </button>
                  <button
                    className="leg-remove"
                    onClick={() => setLegs((x) => x.filter((_, j) => j !== i))}
                    aria-label="Remove leg"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
            <div className="actions">
              <button
                className={`primary${composerBusy === 'sim' ? ' btn-busy' : ''}`}
                disabled={!!composerBusy || legs.length === 0}
                onClick={simulate}
              >
                Run deterministic simulation
              </button>
              <button
                className={composerBusy === 'save' ? 'btn-busy' : ''}
                disabled={!!composerBusy || legs.length === 0}
                onClick={saveStrategy}
              >
                Save strategy
              </button>
              <button
                className={composerBusy === 'ai' ? 'btn-busy' : ''}
                disabled={!!composerBusy || legs.length === 0}
                onClick={explain}
              >
                Explain with AI
              </button>
            </div>
          </section>
          {sim.length > 0 && (
            <section className="panel">
              <div className="kicker">PAYOFF MATRIX</div>
              {sim.map((x) => (
                <div className="scenario" key={x.scenario}>
                  <b>{x.scenario}</b>
                  <span>cost {x.cost.toFixed(3)}</span>
                  <span>payout {x.payout.toFixed(3)}</span>
                  <strong className={x.pnl >= 0 ? 'up' : 'down'}>
                    {x.pnl >= 0 ? '+' : ''}
                    {x.pnl.toFixed(3)}
                  </strong>
                </div>
              ))}
              {ai && (
                <div className="ai">
                  <b>AI explanation</b>
                  <p>{ai}</p>
                </div>
              )}
            </section>
          )}
          <section className="panel log">
            <div className="kicker">EXECUTION LOG</div>
            <p className="muted">
              Every attempt hits the real guarded endpoint — a rejection here (e.g.
              “ENABLE_LIVE_TRADING is false”) is the safety switch working, not a UI mock.
            </p>
            {execLog.length === 0 ? (
              <div className="empty">
                <b>No executions yet</b>
                Click “Execute (testnet)” on a leg above to send it.
              </div>
            ) : (
              execLog.map((x, i) => (
                <div className="log-row" key={i}>
                  <span className={`status ${x.ok ? 'up' : 'down'}`}>
                    {x.ok ? 'OK' : 'BLOCKED'}
                  </span>
                  <span className="detail">
                    {x.symbol || '—'} {x.side || ''} {x.quantity ?? ''}@{x.price ?? ''}
                    {x.txHash ? ` · tx ${short(x.txHash, 10, 0)}` : x.error ? ` · ${x.error}` : ''}
                  </span>
                  <time>{timeAgo(x.at)}</time>
                </div>
              ))
            )}
          </section>
        </>
      )}
      {tab === 'portfolio' && (
        <>
          <section className="panel">
            <div className="kicker">PORTFOLIO</div>
            <h3>{wallet.address ? 'Wallet connected' : 'Connect your wallet'}</h3>
            <p className="muted">
              The connected address is used for portfolio/position reads. Server-side execution
              remains separately gated by the testnet safety switch.
            </p>
            {wallet.address && (
              <button className={portfolioBusy ? 'btn-busy' : ''} onClick={refreshPortfolio}>
                Refresh portfolio
              </button>
            )}
            {portfolioResult && (
              <pre className="result-json">{JSON.stringify(portfolioResult, null, 2)}</pre>
            )}
          </section>
          <section className="panel">
            <div className="kicker">SETTLEMENT TOOLS</div>
            <p className="muted">
              Mint/merge complete sets, redeem a finalized market, or reconcile fills — these call
              the raw BinaryMarketsModule directly and are gated by the same server-side testnet
              switch.
            </p>
            <div className="fields">
              <label>
                Market ID (bytes32)
                <input
                  value={settleMarketId}
                  onChange={(e) => setSettleMarketId(e.target.value)}
                  placeholder="0x…"
                />
              </label>
              <label>
                Amount (raw base units)
                <input
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  type="number"
                />
              </label>
              <label>
                Outcome idx
                <input
                  value={settleOutcomeIdx}
                  onChange={(e) => setSettleOutcomeIdx(e.target.value)}
                  type="number"
                />
              </label>
              <label>
                Token (for balance check)
                <input
                  value={settleToken}
                  onChange={(e) => setSettleToken(e.target.value)}
                  placeholder="0x… collateral or outcome token"
                />
              </label>
            </div>
            <div className="actions">
              <button
                className={settleBusyAction === 'prepare' ? 'btn-busy' : ''}
                disabled={!!settleBusyAction || !settleMarketId}
                onClick={() => settle('prepare')}
              >
                Prepare / read market
              </button>
              <button
                className={settleBusyAction === 'mint' ? 'btn-busy' : ''}
                disabled={!!settleBusyAction || !settleMarketId}
                onClick={() => settle('mint')}
              >
                Mint complete set
              </button>
              <button
                className={settleBusyAction === 'merge' ? 'btn-busy' : ''}
                disabled={!!settleBusyAction || !settleMarketId}
                onClick={() => settle('merge')}
              >
                Merge complete set
              </button>
              <button
                className={settleBusyAction === 'redeem' ? 'btn-busy' : ''}
                disabled={!!settleBusyAction || !settleMarketId}
                onClick={() => settle('redeem')}
              >
                Redeem
              </button>
              <button
                className={settleBusyAction === 'balance' ? 'btn-busy' : ''}
                disabled={!!settleBusyAction || !wallet.address || !settleToken}
                onClick={() => settle('balance')}
              >
                Check balance
              </button>
              <button
                className={settleBusyAction === 'reconcile' ? 'btn-busy' : ''}
                disabled={!!settleBusyAction || !wallet.address}
                onClick={() => settle('reconcile')}
              >
                Reconcile fills
              </button>
            </div>
            {settleLog.length === 0 ? (
              <div className="empty" style={{ marginTop: 14 }}>
                <b>No settlement actions yet</b>
                Paste a market ID above and try “Prepare / read market” first.
              </div>
            ) : (
              <div>
                {settleLog.map((x, i) => (
                  <div className="log-row" key={i}>
                    <span className={`status ${x.ok ? 'up' : 'down'}`}>
                      {x.action.toUpperCase()}
                    </span>
                    <span className="detail">
                      {x.txHash
                        ? `tx ${short(x.txHash, 10, 0)}`
                        : JSON.stringify(x.balance ?? x.onchain ?? x.error ?? x.message ?? x).slice(
                            0,
                            90,
                          )}
                    </span>
                    <time>{timeAgo(x.at)}</time>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
      {tab === 'replay' && (
        <section className="panel">
          <div className="kicker">HISTORICAL REPLAY</div>
          <h3>Finalized market replay</h3>
          <p className="muted">
            Replay uses finalized Event Contract records instead of synthetic history. Snapshot
            history is persisted locally by the SyncPact server.
          </p>
          <button className={replayBusy ? 'btn-busy' : ''} onClick={loadFinalized}>
            Load finalized markets
          </button>
          {replayResult && (
            <pre className="result-json">{JSON.stringify(replayResult, null, 2)}</pre>
          )}
        </section>
      )}
      <footer>
        <span>SyncPact 1.0 · testnet-first</span>
        <span>AI explains · code calculates · blockchain proves</span>
      </footer>
      <div className="toasts">
        {toasts.map((t) => (
          <div className={`toast ${t.type}`} key={t.id}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
