import fs from 'node:fs';
import path from 'node:path';
const file = path.resolve(process.env.DB_PATH || './data/syncpact.json');
type DB = {
  wallets: Record<string, any>;
  strategies: any[];
  trades: any[];
  events: any[];
  snapshots: any[];
};
const empty = (): DB => ({ wallets: {}, strategies: [], trades: [], events: [], snapshots: [] });
function read(): DB {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return empty();
  }
}
function write(db: DB) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}
export function dbGet() {
  return read();
}
export function dbUpdate(fn: (db: DB) => void) {
  const db = read();
  fn(db);
  write(db);
  return db;
}
export function recordSnapshot(snapshot: any) {
  dbUpdate((db) => {
    db.snapshots.push(snapshot);
    if (db.snapshots.length > 5000) db.snapshots.shift();
  });
}
export function recordTrade(t: any) {
  dbUpdate((db) => db.trades.push(t));
}
export function saveStrategy(s: any) {
  dbUpdate((db) => {
    const i = db.strategies.findIndex((x) => x.id === s.id);
    if (i >= 0) db.strategies[i] = s;
    else db.strategies.push(s);
  });
}
