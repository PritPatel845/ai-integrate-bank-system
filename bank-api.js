'use strict';

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');
const { parseCents, formatCents } = require('./money-utils');
const IntelligenceEngine = require('./intelligence');
const IntentRouter = require('./intent_router');
const Optimizer = require('./optimizer');
const SovereignAgent = require('./sovereign_agent');
const { encrypt, decrypt } = require('./security-vault');
const { mountMerchantAgent } = require('./merchant-agent');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_URL = process.env.APP_ORIGIN || 'http://localhost:3000';
const PAYPAL_ALLOWED_ORIGINS = [PUBLIC_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'];

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function money(cents) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

function safeParseAmount(value) {
  return parseCents(value, { allowZero: false });
}

function maskEmail(email) {
  if (!email) return 'Not set';
  const [user, domain] = String(email).split('@');
  if (!domain) return email;
  const visible = user.slice(0, 2) || 'x';
  return `${visible}***@${domain}`;
}

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Sign in required' });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Sign in required' });
    }
    if (req.session.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function accountAllowed(req, accountId) {
  const user = req.session?.user;
  if (!user) return false;
  if (user.role === 'employee' || user.role === 'monitor') return true;
  return user.accountId === accountId;
}

function encryptAccountEmail(value) {
  if (!value || !String(value).trim()) return null;
  return encrypt(String(value).trim().toLowerCase());
}

function decryptAccountEmail(value) {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch (error) {
    return value;
  }
}

function ensureSchema() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('customer','merchant','employee','monitor')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
      paypal_email TEXT,
      created_at TEXT NOT NULL
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
      payment_link_id TEXT,
      metadata TEXT
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

    CREATE TABLE IF NOT EXISTS webhook_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      received_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      actor_role TEXT,
      action TEXT NOT NULL,
      subject_id TEXT,
      reason TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS account_controls (
      account_id TEXT PRIMARY KEY REFERENCES accounts(id),
      status TEXT NOT NULL,
      reason TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      changed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_links (
      id TEXT PRIMARY KEY,
      merchant_account_id TEXT NOT NULL REFERENCES accounts(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      paid_at TEXT,
      checkout_url TEXT
    );

    CREATE TABLE IF NOT EXISTS payment_orders (
      order_id TEXT PRIMARY KEY,
      link_id TEXT NOT NULL REFERENCES payment_links(id),
      capture_id TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallet_orders (
      order_id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id),
      loan_id TEXT REFERENCES loans(id),
      kind TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_requests (
      id TEXT PRIMARY KEY,
      requester_account_id TEXT NOT NULL REFERENCES accounts(id),
      recipient_account_id TEXT NOT NULL REFERENCES accounts(id),
      amount_cents INTEGER NOT NULL,
      note TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS order_drafts (
      id TEXT PRIMARY KEY,
      merchant_account_id TEXT NOT NULL REFERENCES accounts(id),
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','link_created','paid','rejected')),
      source TEXT NOT NULL,
      source_text TEXT NOT NULL DEFAULT '',
      customer_name TEXT NOT NULL DEFAULT '',
      customer_contact TEXT NOT NULL DEFAULT '',
      items TEXT NOT NULL,
      fee_label TEXT NOT NULL DEFAULT '',
      fee_cents INTEGER NOT NULL DEFAULT 0,
      subtotal_cents INTEGER NOT NULL DEFAULT 0,
      total_cents INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      notes TEXT NOT NULL DEFAULT '',
      payment_link_id TEXT,
      approved_by TEXT,
      approved_at TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_loans_account ON loans(account_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_payment_links_merchant ON payment_links(merchant_account_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_order_drafts_merchant ON order_drafts(merchant_account_id, created_at);
  `);
}

const db = new DatabaseSync(process.env.DATABASE_PATH || path.join(__dirname, 'bank.sqlite'));
ensureSchema();

const aiBrain = new IntelligenceEngine(db);
const intentRouter = new IntentRouter(db);
const sovereignAgent = new SovereignAgent(db);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://api-m.sandbox.paypal.com'],
      connectSrc: ["'self'", 'https://api-m.sandbox.paypal.com']
    }
  }
}));

app.use(cors({ origin: PAYPAL_ALLOWED_ORIGINS, credentials: true }));
app.use('/api/paypal/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '2mb' }));
app.use(session({
  name: 'merchant.sid',
  secret: process.env.SESSION_SECRET || 'default_secret_at_least_32_chars_long_!!!',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 }
}));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/client-main.js', (req, res) => res.sendFile(path.join(__dirname, 'client-main.js')));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/merchant.html', requireAuth, (req, res) => {
  if (req.session.user.role !== 'merchant') return res.status(403).send('Forbidden');
  res.sendFile(path.join(__dirname, 'merchant.html'));
});
app.get('/bank-interface.html', requireAuth, (req, res) => {
  if (req.session.user.role === 'merchant') return res.redirect('/merchant.html');
  res.sendFile(path.join(__dirname, 'bank-interface.html'));
});
app.get('/checkout/:linkId', (req, res) => {
  const row = db.prepare('SELECT * FROM payment_links WHERE id=?').get(req.params.linkId);
  if (!row || row.status !== 'active') {
    return res.status(404).send('Checkout link not found or retired.');
  }
  res.sendFile(path.join(__dirname, 'checkout.html'));
});

app.get('/:page', (req, res) => {
  const page = req.params.page;
  const allowed = ['login', 'login.html', 'merchant', 'merchant.html', 'bank-interface', 'bank-interface.html', 'checkout'];
  if (!allowed.includes(page)) {
    return res.status(404).send('Page not found');
  }
  const file = page.includes('.') ? page : `${page}.html`;
  const target = path.join(__dirname, file);
  if (!target.startsWith(__dirname)) return res.status(400).send('Bad request');
  res.sendFile(target);
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role = 'customer', paypalEmail = '' } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  const safeRole = ['customer', 'merchant', 'employee', 'monitor'].includes(role) ? role : 'customer';
  try {
    const userId = id('user');
    const accountId = id('acct');
    const hash = await bcrypt.hash(String(password), 12);
    db.prepare('INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)').run(userId, String(email).toLowerCase(), String(name), hash, safeRole, now());
    db.prepare('INSERT INTO accounts (id,user_id,paypal_email,created_at) VALUES (?,?,?,?)').run(accountId, userId, encryptAccountEmail(paypalEmail), now());
    req.session.user = { id: userId, email: String(email).toLowerCase(), name: String(name), role: safeRole, accountId };
    res.status(201).json({ user: req.session.user });
  } catch (error) {
    console.error('Signup failed:', error.message);
    res.status(409).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = db.prepare('SELECT u.*, a.id AS account_id FROM users u LEFT JOIN accounts a ON a.user_id = u.id WHERE u.email = ?').get(String(email).toLowerCase());
  if (!user || !(await bcrypt.compare(String(password), user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  req.session.user = { id: user.id, email: user.email, name: user.name, role: user.role, accountId: user.account_id };
  res.json({ user: req.session.user });
});

app.get('/api/accounts', requireAuth, (req, res) => {
  const user = req.session.user;
  let rows;
  if (user.role === 'employee' || user.role === 'monitor') {
    rows = db.prepare('SELECT a.id AS accountId, a.paypal_email AS paypalEmail, COALESCE(SUM(t.amount_cents),0) AS balance FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id AND t.status = "COMPLETED" GROUP BY a.id ORDER BY a.created_at DESC').all();
  } else {
    rows = db.prepare('SELECT a.id AS accountId, a.paypal_email AS paypalEmail, COALESCE(SUM(t.amount_cents),0) AS balance FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id AND t.status = "COMPLETED" WHERE a.user_id = ? GROUP BY a.id ORDER BY a.created_at DESC').all(user.id);
  }
  res.json(rows.map(row => ({
    accountId: row.accountId,
    paypalEmail: decryptAccountEmail(row.paypalEmail),
    balance: money(row.balance),
    balanceCents: Number(row.balance || 0)
  })));
});

app.get('/api/accounts/:accountId', requireAuth, (req, res) => {
  const accountId = req.params.accountId;
  if (!accountAllowed(req, accountId)) return res.status(403).json({ error: 'Forbidden' });
  const row = db.prepare('SELECT a.*, u.email, u.name, u.role, COALESCE(SUM(t.amount_cents),0) AS balance FROM accounts a INNER JOIN users u ON u.id = a.user_id LEFT JOIN transactions t ON t.account_id = a.id AND t.status = "COMPLETED" WHERE a.id = ? GROUP BY a.id').get(accountId);
  if (!row) return res.status(404).json({ error: 'Account not found' });
  res.json({
    accountId: row.id,
    userId: row.user_id,
    user: { name: row.name, email: row.email, role: row.role },
    paypalEmail: decryptAccountEmail(row.paypal_email),
    balance: money(row.balance || 0),
    balanceCents: Number(row.balance || 0)
  });
});

app.get('/api/accounts/:accountId/balance', requireAuth, (req, res) => {
  const accountId = req.params.accountId;
  if (!accountAllowed(req, accountId)) return res.status(403).json({ error: 'Forbidden' });
  const row = db.prepare("SELECT COALESCE(SUM(amount_cents),0) AS total FROM transactions WHERE account_id=? AND status='COMPLETED'").get(accountId);
  const balance = Number(row?.total || 0);
  const insights = aiBrain.calculateSafeBalance(accountId, balance);
  res.json({
    accountId,
    balance: money(balance),
    balanceCents: balance,
    safeBalance: money(insights.safeBalanceCents),
    safeBalanceCents: Number(insights.safeBalanceCents || 0),
    insights: insights.insights || []
  });
});

app.get('/api/accounts/:accountId/transactions', requireAuth, (req, res) => {
  const accountId = req.params.accountId;
  if (!accountAllowed(req, accountId)) return res.status(403).json({ error: 'Forbidden' });
  const txs = db.prepare('SELECT * FROM transactions WHERE account_id=? ORDER BY created_at DESC').all(accountId);
  res.json(txs.map(tx => ({
    id: tx.id,
    type: tx.kind,
    kind: tx.kind,
    amount: money(tx.amount_cents),
    amountCents: Number(tx.amount_cents),
    currency: tx.currency,
    status: tx.status,
    reason: tx.reason || tx.kind,
    timestamp: tx.created_at,
    reference: tx.paypal_id || tx.id,
    paymentLinkId: tx.payment_link_id || null
  })));
});

app.post('/api/accounts/:accountId/transfer/quote', requireAuth, (req, res) => {
  const accountId = req.params.accountId;
  if (!accountAllowed(req, accountId)) return res.status(403).json({ error: 'Forbidden' });
  const { recipient, amount } = req.body || {};
  if (!recipient || amount === undefined) return res.status(400).json({ error: 'recipient and amount are required' });
  const cents = safeParseAmount(amount);
  if (cents === null) return res.status(400).json({ error: 'Invalid amount' });
  const recipientRow = db.prepare('SELECT u.email, a.id AS accountId FROM users u INNER JOIN accounts a ON a.user_id = u.id WHERE u.email = ? OR a.id = ?').get(String(recipient).toLowerCase(), String(recipient));
  if (!recipientRow || recipientRow.accountId === accountId) return res.status(404).json({ error: 'Recipient not found' });
  res.json({
    recipientId: recipientRow.accountId,
    recipientEmail: recipientRow.email,
    maskedEmail: maskEmail(recipientRow.email),
    amount: money(cents),
    amountCents: cents
  });
});

app.post('/api/accounts/:accountId/transfer', requireAuth, (req, res) => {
  const accountId = req.params.accountId;
  if (!accountAllowed(req, accountId)) return res.status(403).json({ error: 'Forbidden' });
  const { recipient, amount, confirmed } = req.body || {};
  const cents = safeParseAmount(amount);
  if (cents === null || !recipient) return res.status(400).json({ error: 'Invalid transfer request' });
  if (confirmed !== true) return res.status(400).json({ error: 'Transfer requires confirmation' });
  const current = db.prepare("SELECT COALESCE(SUM(amount_cents),0) AS total FROM transactions WHERE account_id=? AND status='COMPLETED'").get(accountId);
  const balance = Number(current?.total || 0);
  if (balance < cents) return res.status(409).json({ error: 'Insufficient balance' });
  const recipientRow = db.prepare('SELECT u.email, a.id AS accountId FROM users u INNER JOIN accounts a ON a.user_id = u.id WHERE u.email = ? OR a.id = ?').get(String(recipient).toLowerCase(), String(recipient));
  if (!recipientRow || recipientRow.accountId === accountId) return res.status(404).json({ error: 'Recipient not found' });

  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO transactions (id, account_id, kind, amount_cents, currency, status, counterparty, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id('tx'), accountId, 'transfer_out', -cents, 'USD', 'COMPLETED', recipientRow.email, 'Outgoing transfer', now());
    db.prepare('INSERT INTO transactions (id, account_id, kind, amount_cents, currency, status, counterparty, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id('tx'), recipientRow.accountId, 'transfer_in', cents, 'USD', 'COMPLETED', req.session.user.email, 'Incoming transfer', now());
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Transfer failed' });
  }

  const newBalance = db.prepare("SELECT COALESCE(SUM(amount_cents),0) AS total FROM transactions WHERE account_id=? AND status='COMPLETED'").get(accountId);
  res.status(201).json({
    success: true,
    amount: money(cents),
    amountCents: cents,
    recipient: recipientRow.email,
    balanceCents: Number(newBalance?.total || 0)
  });
});

app.post('/api/loans', requireAuth, (req, res) => {
  const { amount, purpose } = req.body || {};
  const amountCents = safeParseAmount(amount);
  if (amountCents === null) return res.status(400).json({ error: 'Invalid loan amount' });
  const accountId = req.session.user.accountId;
  const open = db.prepare("SELECT id FROM loans WHERE account_id=? AND status IN ('pending','approved','payout_pending') ORDER BY created_at DESC LIMIT 1").get(accountId);
  if (open) return res.status(409).json({ error: 'You already have an open loan' });
  const loanId = id('loan');
  db.prepare('INSERT INTO loans (id, account_id, amount_cents, purpose, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(loanId, accountId, amountCents, String(purpose || '').trim() || 'General use', 'pending', now());
  res.status(201).json({ loan: { id: loanId, accountId, amount: money(amountCents), amountCents, purpose: String(purpose || '').trim() || 'General use', status: 'pending' } });
});

app.get('/api/loans', requireAuth, (req, res) => {
  let rows;
  if (req.session.user.role === 'employee' || req.session.user.role === 'monitor') {
    rows = db.prepare('SELECT * FROM loans ORDER BY created_at DESC').all();
  } else {
    rows = db.prepare('SELECT * FROM loans WHERE account_id=? ORDER BY created_at DESC').all(req.session.user.accountId);
  }
  res.json(rows.map(l => ({
    id: l.id,
    accountId: l.account_id,
    amount: money(l.amount_cents),
    amountCents: Number(l.amount_cents),
    purpose: l.purpose,
    status: l.status,
    createdAt: l.created_at
  })));
});

app.post('/api/merchant/payment-links', requireAuth, requireRole('merchant'), (req, res) => {
  const { title, description, amount } = req.body || {};
  const cents = safeParseAmount(amount);
  if (!title || cents === null) return res.status(400).json({ error: 'Valid title and amount required' });
  const linkId = id('pay');
  const checkoutUrl = `${PUBLIC_URL}/checkout/${linkId}`;
  db.prepare('INSERT INTO payment_links (id, merchant_account_id, title, description, amount_cents, status, created_at, checkout_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(linkId, req.session.user.accountId, String(title).slice(0, 200), String(description || ''), cents, 'active', now(), checkoutUrl);
  res.status(201).json({
    linkId,
    title: String(title).slice(0, 200),
    description: String(description || ''),
    amount: money(cents),
    amountCents: cents,
    checkoutUrl
  });
});

app.get('/api/merchant/payment-links', requireAuth, requireRole('merchant'), (req, res) => {
  const rows = db.prepare('SELECT * FROM payment_links WHERE merchant_account_id=? ORDER BY created_at DESC').all(req.session.user.accountId);
  res.json(rows.map(row => ({
    linkId: row.id,
    title: row.title,
    description: row.description,
    amount: money(row.amount_cents),
    amountCents: Number(row.amount_cents),
    sales: 0,
    salesCount: 0,
    checkoutUrl: row.checkout_url || `${PUBLIC_URL}/checkout/${row.id}`
  })));
});

app.get('/api/merchant/payment-links/:linkId/qr', requireAuth, requireRole('merchant'), async (req, res) => {
  const row = db.prepare('SELECT * FROM payment_links WHERE id=? AND merchant_account_id=?').get(req.params.linkId, req.session.user.accountId);
  if (!row) return res.status(404).json({ error: 'Payment link not found' });
  const url = row.checkout_url || `${PUBLIC_URL}/checkout/${row.id}`;
  try {
    const dataUrl = await QRCode.toDataURL(url);
    res.json({ dataUrl });
  } catch (error) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

app.get('/api/public/payment-links/:linkId', (req, res) => {
  const row = db.prepare('SELECT * FROM payment_links WHERE id=?').get(req.params.linkId);
  if (!row || row.status !== 'active') return res.status(404).json({ error: 'Payment link not found' });
  res.json({
    linkId: row.id,
    title: row.title,
    description: row.description,
    amount: money(row.amount_cents),
    amountCents: Number(row.amount_cents),
    checkoutUrl: row.checkout_url || `${PUBLIC_URL}/checkout/${row.id}`
  });
});

app.get('/api/merchant/dashboard', requireAuth, requireRole('merchant'), (req, res) => {
  const rows = db.prepare("SELECT * FROM transactions WHERE account_id=? AND kind='merchant_sale' AND status='COMPLETED' ORDER BY created_at DESC").all(req.session.user.accountId);
  const total = rows.reduce((sum, r) => sum + Number(r.amount_cents || 0), 0);
  res.json({
    salesCount: rows.length,
    grossSales: money(total),
    grossSalesCents: total,
    transactions: rows.map(tx => ({
      id: tx.id,
      reason: tx.reason || 'Merchant sale',
      amount: money(Math.abs(Number(tx.amount_cents || 0))),
      amountCents: Math.abs(Number(tx.amount_cents || 0)),
      status: tx.status,
      timestamp: tx.created_at,
      reference: tx.paypal_id || tx.id,
      type: tx.kind
    }))
  });
});

app.post('/api/merchant/sales/:captureId/refund', requireAuth, requireRole('merchant'), (req, res) => {
  const captureId = req.params.captureId;
  const row = db.prepare("SELECT * FROM transactions WHERE paypal_id=? AND account_id=? AND kind='merchant_sale' AND status='COMPLETED'").get(captureId, req.session.user.accountId);
  if (!row) return res.status(404).json({ error: 'Sale not found' });
  const remaining = Number(row.amount_cents || 0);
  const currentBalance = db.prepare("SELECT COALESCE(SUM(amount_cents),0) AS total FROM transactions WHERE account_id=? AND status='COMPLETED'").get(req.session.user.accountId);
  const balance = Number(currentBalance?.total || 0);
  if (balance - remaining < 0) return res.status(409).json({ error: 'Refund would make the merchant balance negative' });
  db.prepare('INSERT INTO transactions (id, account_id, kind, amount_cents, currency, status, paypal_id, counterparty, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id('ref'), req.session.user.accountId, 'refund', -Math.abs(remaining), 'USD', 'COMPLETED', `${captureId}_refund`, 'merchant', 'Refund', now());
  res.json({ success: true, refundedCents: Math.abs(remaining) });
});

app.post('/api/profile/paypal-email', requireAuth, (req, res) => {
  const email = (req.body && req.body.paypalEmail) || '';
  db.prepare('UPDATE accounts SET paypal_email=? WHERE id=?').run(encryptAccountEmail(email), req.session.user.accountId);
  res.json({ success: true, paypalEmail: email || null });
});

app.post('/api/intent', requireAuth, (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Text is required' });
  const parsed = intentRouter.resolve(text, req.session.user);
  if (parsed.action === 'UNKNOWN') return res.status(400).json({ error: 'Intent not recognized' });
  res.json({ text: `Executed ${parsed.action} successfully.`, action: parsed.action, params: parsed.params });
});

app.post('/api/sovereign/mandate', requireAuth, (req, res) => {
  const { category, amount } = req.body || {};
  const cents = safeParseAmount(amount);
  if (!category || cents === null) return res.status(400).json({ error: 'Invalid mandate request' });
  const mandateId = sovereignAgent.createMandate(req.session.user.accountId, category, cents);
  res.json({ mandateId, status: 'Active' });
});

app.get('/api/bank/summary', requireAuth, (req, res) => {
  if (req.session.user.role !== 'employee' && req.session.user.role !== 'monitor') return res.status(403).json({ error: 'Forbidden' });
  const total = db.prepare("SELECT COALESCE(SUM(amount_cents),0) AS total FROM transactions WHERE status='COMPLETED'").get();
  res.json({ totalLedgerCents: Number(total.total || 0), totalLedger: money(total.total || 0) });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

mountMerchantAgent({
  app,
  db,
  requireAuth,
  requireRole,
  recordAudit: () => {},
  transaction: (fn) => { db.exec('BEGIN'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } },
  id,
  now
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 SOVEREIGN WALLET LIVE');
  console.log(`Public URL: ${PUBLIC_URL}`);
});

module.exports = { app, server, db };
