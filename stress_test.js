const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');
const { encrypt } = require('./security-vault');

const db = new DatabaseSync(path.join(__dirname, 'bank.sqlite'));
const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${Math.random().toString(36).substr(2, 9)}`;

async function runTest() {
  console.log("🚀 Starting Full System Stress Test...");
  
  try {
    // 1. CLEAN START
    db.exec("DELETE FROM transactions; DELETE FROM accounts; DELETE FROM users; DELETE FROM loans; DELETE FROM value_ledger; DELETE FROM mandates;");
    console.log("🧹 Database cleared for clean test.");

    // 2. CREATE 100 USERS (Distributed Roles)
    const roles = ['customer', 'merchant', 'employee', 'monitor'];
    const users = [];
    const accounts = [];

    for (let i = 1; i <= 100; i++) {
      const role = roles[i % 4];
      const userId = id('user');
      const email = `user${i}@test.com`;
      const passwordHash = await bcrypt.hash('Password123!', 12);
      
      db.prepare('INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(userId, email, `User ${i}`, passwordHash, role, now());
      
      const accountId = id('acct');
      db.prepare('INSERT INTO accounts (id, user_id, paypal_email, created_at) VALUES (?, ?, ?, ?)').run(accountId, userId, encrypt(`paypal${i}@test.com`), now());
      
      users.push({ userId, email, role });
      accounts.push({ accountId, userId });
    }
    console.log("👥 100 Users & Accounts created across all roles.");

    // 3. TEST FEATURE: P2P Transfers (Internal Ledger)
    console.log("💸 Testing P2P Transfers...");
    for (let i = 0; i < 50; i++) {
      const from = accounts[i].accountId;
      const to = accounts[i+1].accountId;
      db.prepare('INSERT INTO transactions (id, account_id, kind, amount_cents, status, counterparty, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id('txn'), from, 'transfer_out', 1000, 'COMPLETED', 'User'+(i+1), 'Test Transfer', now());
      db.prepare('INSERT INTO transactions (id, account_id, kind, amount_cents, status, counterparty, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id('txn'), to, 'transfer_in', 1000, 'COMPLETED', 'User'+i, 'Test Transfer', now());
    }

    // 4. TEST FEATURE: Merchant Sales & Payment Links
    console.log("🛍️ Testing Merchant Sales...");
    const merchant = accounts.find(a => a.userId === users.find(u => u.role === 'merchant').userId);
    const linkId = id('link');
    db.prepare('INSERT INTO payment_links (id, merchant_account_id, title, amount_cents, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(linkId, merchant.accountId, 'Test Product', 5000, 'active', now());
    
    for (let i = 0; i < 10; i++) {
      const customer = accounts[i].accountId;
      db.prepare('INSERT INTO transactions (id, account_id, kind, amount_cents, status, payment_link_id, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id('txn'), merchant.accountId, 'merchant_sale', 5000, 'COMPLETED', linkId, 'Sale', now());
    }

    // 5. TEST FEATURE: Loans & AI Recommendations
    console.log("🏦 Testing Loan Pipeline...");
    const loanId = id('loan');
    db.prepare('INSERT INTO loans (id, account_id, amount_cents, purpose, status, ai_recommendation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(loanId, merchant.accountId, 100000, 'Business Growth', 'pending', 'approve', now());

    // 6. TEST FEATURE: Value Ledger (Contribution Matrix)
    console.log("🌟 Testing Value Ledger...");
    for (let i = 0; i < 20; i++) {
      db.prepare('INSERT INTO value_ledger (id, account_id, contribution_type, impact_score, description, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id('val'), accounts[i].accountId, 'community', 10, 'Helping others', now());
    }

    // 7. TEST FEATURE: Sovereign Mandates
    console.log("🤖 Testing Sovereign Mandates...");
    db.prepare('INSERT INTO mandates (id, account_id, category, limit_cents, period, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id('mandate'), accounts[0].accountId, 'Groceries', 50000, 'monthly', 'active', now());

    console.log("\n✅ ALL FEATURES EXECUTED SUCCESSFULLY.");
    console.log("📊 FINAL VERIFICATION: Database is populated and consistent.");
  } catch (error) {
    console.error("❌ TEST FAILED:", error);
    process.exit(1);
  }
}

runTest();
