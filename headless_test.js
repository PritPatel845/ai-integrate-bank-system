const sqlite3 = require('sqlite3');
const path = require('path');
const IntelligenceEngine = require('./intelligence');
const IntentRouter = require('./intent_router');
const SovereignAgent = require('./sovereign_agent');

const dbPath = path.join(__dirname, 'test_bank.sqlite');
const db_conn = new sqlite3.Database(dbPath);

const run = (sql, params = []) => new Promise((res, rej) => {
  db_conn.run(sql, params, (err) => err ? rej(err) : res());
});

async function runHeadlessTest() {
  console.log("🧪 FINAL SYSTEM VALIDATION (DEBUG MODE)...\n");
  try {
    await run("PRAGMA foreign_keys = OFF;");
    await run("DROP TABLE IF EXISTS users;");
    await run("DROP TABLE IF EXISTS accounts;");
    await run("DROP TABLE IF EXISTS transactions;");
    await run("DROP TABLE IF EXISTS loans;");
    await run("DROP TABLE IF EXISTS value_ledger;");
    await run("DROP TABLE IF EXISTS mandates;");
    
    await run("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL, mfa_secret TEXT, is_verified INTEGER DEFAULT 0, created_at TEXT NOT NULL);");
    await run("CREATE TABLE accounts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), paypal_email TEXT, created_at TEXT NOT NULL);");
    await run("CREATE TABLE transactions (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), kind TEXT NOT NULL, amount_cents INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', status TEXT NOT NULL, paypal_id TEXT, counterparty TEXT, reason TEXT, created_at TEXT NOT NULL, loan_id TEXT REFERENCES loans(id), payment_link_id TEXT);");
    await run("CREATE TABLE loans (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), amount_cents INTEGER NOT NULL, purpose TEXT NOT NULL, status TEXT NOT NULL, ai_recommendation TEXT, ai_summary TEXT, ai_reasons TEXT, ai_data TEXT, ai_at TEXT, created_at TEXT NOT NULL, reviewed_by TEXT, reviewed_at TEXT, payout_id TEXT, interest_rate_bps INTEGER NOT NULL DEFAULT 1200, term_months INTEGER NOT NULL DEFAULT 12, monthly_payment_cents INTEGER NOT NULL DEFAULT 0);");
    await run("CREATE TABLE value_ledger (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), contribution_type TEXT NOT NULL, impact_score INTEGER NOT NULL, description TEXT, created_at TEXT NOT NULL);");
    await run("CREATE TABLE mandates (id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id), category TEXT NOT NULL, limit_cents INTEGER NOT NULL, period TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL);");
    await run("PRAGMA foreign_keys = ON;");

    const aiBrain = new IntelligenceEngine(dbPath);
    const intentRouter = new IntentRouter(db_conn);
    const sovereignAgent = new SovereignAgent(dbPath);

    console.log("Testing: Intent Router...");
    const intent = await intentRouter.resolve("Pay Ravi $20 for coffee", {});
    if (intent && intent.action === 'TRANSFER') console.log("✅ Intent Router: SUCCESS");
    else throw new Error(`Intent Router failed: ${JSON.stringify(intent)}`);

    const userId = 'u1';
    const accountId = 'a1';
    await run('INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)', [userId, 't@t.com', 'T', 'h', 'customer', 'now']);
    await run('INSERT INTO accounts (id, user_id, created_at) VALUES (?, ?, ?)', [accountId, userId, 'now']);
    
    console.log("Injecting Test Data (5x $50 transactions)...");
    for(let i=0; i<5; i++) {
      await run('INSERT INTO transactions (id, account_id, kind, amount_cents, status, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [`txn${i}`, accountId, 'transfer_out', 5000, 'COMPLETED', 'Netflix', new Date().toISOString()]);
    }

    const safe = await aiBrain.calculateSafeBalance(accountId, 100000);
    if (safe.predictedOutflowCents >= 5000) {
      console.log(`✅ AI Brain: SUCCESS (Outflow: ${safe.predictedOutflowCents})`);
    } else {
      throw new Error(`AI Brain failed. Outflow: ${safe.predictedOutflowCents}`);
    }

    const mId = await sovereignAgent.createMandate(accountId, 'Groceries', 10000);
    if (mId) console.log(`✅ Sovereign Agent: SUCCESS`);
    else throw new Error("Sovereign Agent failed");

    console.log("\n🏆 FINAL SYSTEM LOGIC VERIFIED. THE CORE ENGINE IS ROCK SOLID.");
  } catch (error) {
    console.error("\n❌ LOGIC BREAK:");
    console.error(error.message);
    process.exit(1);
  }
}
runHeadlessTest();
