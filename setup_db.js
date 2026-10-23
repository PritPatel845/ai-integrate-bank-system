const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const db = new DatabaseSync(path.join(__dirname, 'bank.sqlite'));

console.log("Initializing Master Database...");

db.exec(`
  PRAGMA journal_mode = WAL; 
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, 
    email TEXT UNIQUE NOT NULL, 
    name TEXT NOT NULL, 
    password_hash TEXT NOT NULL, 
    role TEXT NOT NULL CHECK(role IN ('customer','merchant','employee','monitor')), 
    mfa_secret TEXT,
    is_verified INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY, 
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id), 
    paypal_email TEXT, 
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, 
    account_id TEXT NOT NULL REFERENCES accounts(id), 
    kind TEXT NOT NULL, 
    amount_cents INTEGER NOT NULL, 
    currency TEXT NOT NULL DEFAULT 'USD', 
    status TEXT NOT NULL, 
    paypal_id TEXT, 
    counterparty TEXT, 
    reason TEXT, 
    created_at TEXT NOT NULL, 
    loan_id TEXT REFERENCES loans(id), 
    payment_link_id TEXT
  );

  CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY, 
    account_id TEXT NOT NULL REFERENCES accounts(id), 
    amount_cents INTEGER NOT NULL, 
    purpose TEXT NOT NULL, 
    status TEXT NOT NULL, 
    ai_recommendation TEXT, 
    ai_summary TEXT, 
    ai_reasons TEXT, 
    ai_data TEXT, 
    ai_at TEXT, 
    created_at TEXT NOT NULL, 
    reviewed_by TEXT, 
    reviewed_at TEXT, 
    payout_id TEXT, 
    interest_rate_bps INTEGER NOT NULL DEFAULT 1200, 
    term_months INTEGER NOT NULL DEFAULT 12, 
    monthly_payment_cents INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS value_ledger (
    id TEXT PRIMARY KEY, 
    account_id TEXT NOT NULL REFERENCES accounts(id), 
    contribution_type TEXT NOT NULL, 
    impact_score INTEGER NOT NULL, 
    description TEXT, 
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS mandates (
    id TEXT PRIMARY KEY, 
    account_id TEXT NOT NULL REFERENCES accounts(id), 
    category TEXT NOT NULL, 
    limit_cents INTEGER NOT NULL, 
    period TEXT NOT NULL, 
    status TEXT NOT NULL, 
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS webhook_events (event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, received_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, actor_id TEXT, actor_role TEXT, action TEXT NOT NULL, subject_id TEXT, reason TEXT, details TEXT, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, sess TEXT NOT NULL, expires_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS account_controls (account_id TEXT PRIMARY KEY REFERENCES accounts(id), status TEXT NOT NULL, reason TEXT NOT NULL, changed_by TEXT NOT NULL, changed_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS payment_links (id TEXT PRIMARY KEY, merchant_account_id TEXT NOT NULL REFERENCES accounts(id), title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', amount_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS payment_orders (order_id TEXT PRIMARY KEY, link_id TEXT NOT NULL REFERENCES payment_links(id), capture_id TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS wallet_orders (order_id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), loan_id TEXT REFERENCES loans(id), kind TEXT NOT NULL CHECK(kind IN ('wallet_funding','repayment')), amount_cents INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS payment_requests (id TEXT PRIMARY KEY, requester_account_id TEXT NOT NULL REFERENCES accounts(id), recipient_account_id TEXT NOT NULL REFERENCES accounts(id), amount_cents INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', transfer_id TEXT, created_at TEXT NOT NULL, resolved_at TEXT);

  CREATE INDEX IF NOT EXISTS transactions_account_created ON transactions(account_id, created_at);
  CREATE INDEX IF NOT EXISTS loans_account_created ON loans(account_id, created_at);
  CREATE INDEX IF NOT EXISTS value_account_idx ON value_ledger(account_id);
  CREATE INDEX IF NOT EXISTS mandate_account_idx ON mandates(account_id);
`);

console.log("✅ Master Database restored and tables synchronized.");
