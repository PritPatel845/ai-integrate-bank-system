const crypto = require('crypto');
const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');
const { parseCents } = require('./money-utils');
const IntelligenceEngine = require('./intelligence');
const IntentRouter = require('./intent_router');
const Optimizer = require('./optimizer');
const SovereignAgent = require('./sovereign_agent');
const { encrypt, decrypt } = require('./security-vault');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_URL = 'https://unclog-gonad-smitten.ngrok-free.dev';

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

app.use(cors({ 
  origin: [PUBLIC_URL, 'http://localhost:3000'], 
  credentials: true 
}));

app.use('/api/paypal/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

app.use(session({
  name: 'merchant.sid',
  secret: process.env.SESSION_SECRET || 'default_secret_at_least_32_chars_long_!!!',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 }
}));

const db = new DatabaseSync(process.env.DATABASE_PATH || path.join(__dirname, 'bank.sqlite'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

const aiBrain = new IntelligenceEngine(db);
const intentRouter = new IntentRouter(db);
const sovereignAgent = new SovereignAgent(db);

const now = () => new Date().toISOString();
const id = prefix => `${prefix}_${crypto.randomUUID()}`;
const money = cents => Number((cents / 100).toFixed(2));
const centsFrom = value => parseCents(value);

function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Sign in required' });
  next();
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/client-main.js', (req, res) => res.sendFile(path.join(__dirname, 'client-main.js')));
app.get('/:page', (req, res) => {
  let page = req.params.page;
  if (page === 'bank interface') page = 'bank-interface';
  res.sendFile(path.join(__dirname, `${page}.html`));
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password, role = 'customer', paypalEmail = '' } = req.body;
  try {
    const userId = id('user');
    const accountId = id('acct');
    const hash = await bcrypt.hash(password, 12);
    db.exec('BEGIN');
    db.prepare('INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)').run(userId, email.toLowerCase(), name, hash, role, now());
    db.prepare('INSERT INTO accounts (id,user_id,paypal_email,created_at) VALUES (?,?,?,?)').run(accountId, userId, encrypt(paypalEmail.toLowerCase() || null), now());
    db.exec('COMMIT');
    req.session.user = { id: userId, email, role, accountId };
    res.status(201).json({ user: req.session.user });
  } catch (e) { res.status(409).json({ error: 'Signup failed' }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT u.*, a.id AS account_id FROM users u LEFT JOIN accounts a ON a.user_id=u.id WHERE u.email=?').get(String(email).toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  req.session.user = { id: user.id, email: user.email, role: user.role, accountId: user.account_id };
  res.json({ user: req.session.user });
});

app.get('/api/accounts', requireAuth, (req, res) => {
  const accts = db.prepare('SELECT a.id as accountId, a.paypal_email as paypalEmail, (SELECT COALESCE(SUM(amount_cents),0) FROM transactions WHERE account_id=a.id AND status="COMPLETED") as balance FROM accounts a WHERE a.user_id=?').all(req.session.user.id);
  res.json(accts.map(a => ({ ...a, balance: money(a.balance) })));
});

app.get('/api/accounts/:accountId/balance', requireAuth, (req, res) => {
  const balanceCents = db.prepare("SELECT COALESCE(SUM(amount_cents),0) FROM transactions WHERE account_id=? AND status='COMPLETED'").get(req.params.accountId).get(0) || 0;
  const insights = aiBrain.calculateSafeBalance(req.params.accountId, balanceCents);
  res.json({ balance: money(balanceCents), safeBalance: money(insights.safeBalanceCents), insights: insights.insights });
});

app.get('/api/accounts/:accountId/transactions', requireAuth, (req, res) => {
  const txs = db.prepare("SELECT * FROM transactions WHERE account_id=? ORDER BY created_at DESC").all(req.params.accountId);
  res.json(txs.map(t => ({ ...t, amount: money(t.amount_cents) })));
});

app.post('/api/intent', requireAuth, (req, res) => {
  const { text } = req.body;
  const intent = intentRouter.resolve(text, req.session.user);
  if (intent.action === 'UNKNOWN') return res.status(400).json({ error: 'Intent not recognized' });
  res.json({ text: `Executed ${intent.action} successfully.` });
});

app.post('/api/sovereign/mandate', requireAuth, (req, res) => {
  const { category, amount } = req.body;
  const cents = centsFrom(amount);
  const mandateId = sovereignAgent.createMandate(req.session.user.accountId, category, cents);
  res.json({ mandateId, status: 'Active' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SOVEREIGN WALLET LIVE`);
  console.log(`Public URL: ${PUBLIC_URL}`);
});
