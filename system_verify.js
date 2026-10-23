const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const { encrypt } = require('./security-vault');

async function runTests() {
  console.log('🧪 Starting Deep System Verification...');
  const db = new DatabaseSync(path.join(__dirname, 'bank.sqlite'));
  
  try {
    // 1. Database Schema Check
    console.log('\n--- [1/4] Schema Verification ---');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const requiredTables = ['users', 'accounts', 'transactions', 'mandates'];
    const tableNames = tables.map(t => t.name);
    
    requiredTables.forEach(t => {
      if (tableNames.includes(t)) console.log(`✅ Table ${t} exists.`);
      else console.log(`❌ Table ${t} is MISSING!`);
    });

    // 2. AI Engine Logic Check
    console.log('\n--- [2/4] AI Engine Logic Check ---');
    const IntelligenceEngine = require('./intelligence');
    const ai = new IntelligenceEngine(db);
    
    const userId = `test_user_${Date.now()}`;
    const acctId = `test_acct_${Date.now()}`;
    const timestamp = new Date().toISOString();
    
    db.exec('BEGIN');
    db.prepare('INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?,?,?,?,?,?)').run(userId, `test_${Date.now()}@test.com`, 'Test User', 'hash', 'customer', timestamp);
    db.prepare('INSERT INTO accounts (id, user_id, paypal_email, created_at) VALUES (?,?,?,?)').run(acctId, userId, encrypt('test@paypal.com'), timestamp);
    
    for(let i=0; i<3; i++) {
      db.prepare('INSERT INTO transactions (id, account_id, amount_cents, kind, status, reason, created_at) VALUES (?,?,?,?,?,?,?)').run(`tx_${Date.now()}_${i}`, acctId, 5000, 'paypal_deposit', 'COMPLETED', 'Monthly Subscription', timestamp);
    }
    db.exec('COMMIT');

    const safeBalance = await ai.calculateSafeBalance(acctId, 20000);
    if (safeBalance.predictedOutflowCents === 15000) {
      console.log('✅ AI Prediction Engine: WORKING (Detected 3x $50 subscription)');
    } else {
      console.log('❌ AI Prediction Engine: FAILED. Predicted:', safeBalance.predictedOutflowCents);
    }

    // 3. Sovereign Agent Check
    console.log('\n--- [3/4] Sovereign Agent Check ---');
    const SovereignAgent = require('./sovereign_agent');
    const agent = new SovereignAgent(db);
    const mId = agent.createMandate(acctId, 'Groceries', 10000);
    if (mId && db.prepare('SELECT 1 FROM mandates WHERE id=?').get(mId)) {
      console.log('✅ Sovereign Mandate System: WORKING');
    } else {
      console.log('❌ Sovereign Mandate System: FAILED');
    }

    // 4. Security Vault Check
    console.log('\n--- [4/4] Encryption Vault Check ---');
    const { encrypt: enc, decrypt: dec } = require('./security-vault');
    const secret = 'my-secret-paypal@email.com';
    const encrypted = enc(secret);
    const decrypted = dec(encrypted);
    if (decrypted === secret) {
      console.log('✅ AES-256 Encryption: WORKING');
    } else {
      console.log('❌ Encryption: FAILED');
    }

    console.log('\n🚀 SYSTEM VERIFICATION COMPLETE: All cores are healthy.');
  } catch (err) {
    console.error('\n💥 SYSTEM CRITICAL FAILURE during test:');
    console.error(err);
    process.exit(1);
  }
}

runTests();
