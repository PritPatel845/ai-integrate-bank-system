const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function test() {
  console.log("🧪 Starting End-to-End System Validation...\n");

  try {
    // 1. SIGNUP
    console.log("Checking: Signup...");
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: `test_${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'customer'
      })
    });
    const userData = await signupRes.json();
    if (!signupRes.ok) throw new Error(`Signup failed: ${JSON.stringify(userData)}`);
    const user = userData.user;
    console.log(`✅ Signup Successful: ${user.email}`);

    // 2. LOGIN
    console.log("Checking: Login...");
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: user.email,
        password: 'Password123!'
      })
    });
    if (!loginRes.ok) throw new Error('Login failed');
    console.log(`✅ Login Successful`);

    // 3. AI BALANCE (Predictive Intelligence)
    console.log("Checking: AI Balance & Safe-to-Spend...");
    const balRes = await fetch(`${BASE_URL}/api/accounts/${user.accountId}/balance`);
    const balData = await balRes.json();
    if (!balRes.ok) throw new Error('Balance fetch failed');
    console.log(`✅ AI Brain Response: Balance ${balData.balance}, Safe-to-Spend ${balData.safeBalance}`);

    // 4. INTENT ROUTING (Zero-UI)
    console.log("Checking: Intent Router...");
    const intentRes = await fetch(`${BASE_URL}/api/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: "How much is my safe balance?" })
    });
    const intentData = await intentRes.json();
    if (!intentRes.ok) throw new Error('Intent resolution failed');
    console.log(`✅ Intent Resolved: ${intentData.text}`);

    // 5. CONTRIBUTION MATRIX
    console.log("Checking: Value Ledger...");
    const contRes = await fetch(`${BASE_URL}/api/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: "I helped Sarah with her taxes" })
    });
    if (!contRes.ok) throw new Error('Contribution failed');
    const contData = await contRes.json();
    console.log(`✅ Value Recorded: ${contData.text}`);

    // 6. SOVEREIGN MANDATE
    console.log("Checking: Sovereign Authority...");
    const mandRes = await fetch(`${BASE_URL}/api/sovereign/mandate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'Groceries', amount: '100.00' })
    });
    if (!mandRes.ok) throw new Error('Mandate failed');
    const mandData = await mandRes.json();
    console.log(`✅ Mandate Established: ID ${mandData.mandateId}`);

    console.log("\n🏆 SYSTEM VERIFIED: ALL PHASES ARE CONNECTED AND FUNCTIONAL.");

  } catch (error) {
    console.error("\n❌ SYSTEM BREAK DETECTED:");
    console.error(error.message);
    process.exit(1);
  }
}

test();
